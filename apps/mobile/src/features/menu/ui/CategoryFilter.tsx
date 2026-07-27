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
    style={styles.scrollView}
    contentContainerStyle={styles.container}
    testID="category-filter"
  >
    <Button
      key="all"
      size="small"
      status={selectedCategoryId === null ? 'primary' : 'basic'}
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
        status={selectedCategoryId === category.id ? 'primary' : 'basic'}
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
  // RN's horizontal ScrollView defaults to flexGrow: 1 (see
  // ScrollView.js's styles.baseHorizontal). Left unset, this row eats any
  // leftover vertical space in the column whenever the filtered list is
  // shorter than the screen, and alignItems stretch then stretches the
  // chips to match -- flexGrow: 0 keeps it sized to its own content.
  scrollView: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    marginRight: 8,
    borderRadius: 20,
  },
});
