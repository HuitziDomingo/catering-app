import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '@ui-kitten/components';
import type { MenuCategory } from '@catering-app/shared-types';

type CategoryFilterProps = {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
};

// Componente de presentación pura (sin lógica de negocio), vive en ui/ según
// ADR-020. La categoría "Todas" limpia el filtro (selectedCategoryId: null).
export const CategoryFilter = ({
  categories,
  selectedCategoryId,
  onSelect,
}: CategoryFilterProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.container}
    testID="category-filter"
  >
    <Button
      key="all"
      size="small"
      status="primary"
      appearance={selectedCategoryId === null ? 'filled' : 'outline'}
      style={styles.chip}
      onPress={() => onSelect(null)}
    >
      Todas
    </Button>
    {categories.map((category) => (
      <Button
        key={category.id}
        size="small"
        status="primary"
        appearance={selectedCategoryId === category.id ? 'filled' : 'outline'}
        style={styles.chip}
        onPress={() => onSelect(category.id)}
      >
        {category.name}
      </Button>
    ))}
  </ScrollView>
);

export default CategoryFilter;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    marginRight: 8,
  },
});
