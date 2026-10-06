import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Icon, useTheme } from '@ui-kitten/components';

type DishImageProps = {
  /** URL pública de la imagen (ADR-028), o null/undefined si no tiene. */
  uri: string | null | undefined;
  /** Tamaño y forma: lo decide quien la usa (tarjeta, detalle, miniatura). */
  style?: StyleProp<ViewStyle>;
  /** Lado del ícono del placeholder: proporcional al tamaño de la imagen. */
  iconSize?: number;
  /** Nombre del platillo, para lectores de pantalla. */
  accessibilityLabel?: string;
  testID?: string;
};

const FADE_IN_MS = 200;

/**
 * Imagen de un platillo, compartida por menú, carrito y pedidos (por eso vive
 * en core/ui y no en un feature, ADR-020).
 *
 * - expo-image con caché en memoria y disco: no se vuelve a descargar en
 *   cada visita. Las URLs no cambian de contenido (la API usa una llave nueva
 *   por cada subida, ADR-028), así que cachear sin expirar es seguro.
 * - Mientras carga se ve el fondo con el ícono; la imagen aparece encima con
 *   un fundido corto.
 * - Sin imagen, o si la URL falla (objeto borrado, sin conexión), se queda
 *   el placeholder: nunca un hueco vacío ni un ícono roto.
 */
export const DishImage = ({
  uri,
  style,
  iconSize = 32,
  accessibilityLabel,
  testID = 'dish-image',
}: DishImageProps) => {
  const theme = useTheme();
  // Se guarda la URL que falló, no un booleano: si llega otra URL (el staff
  // reemplazó la imagen) se vuelve a intentar sin tener que resetear estado.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const showImage = Boolean(uri) && failedUri !== uri;
  const loaded = showImage && loadedUri === uri;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        { backgroundColor: theme['background-basic-color-3'] },
        style,
      ]}
    >
      {!loaded ? (
        <Icon
          testID={`${testID}-placeholder`}
          name="image-outline"
          fill={theme['text-hint-color']}
          style={{ width: iconSize, height: iconSize }}
        />
      ) : null}
      {showImage ? (
        <Image
          testID={`${testID}-img`}
          source={{ uri: uri as string }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={uri}
          transition={FADE_IN_MS}
          onLoad={() => setLoadedUri(uri as string)}
          onError={() => setFailedUri(uri as string)}
        />
      ) : null}
    </View>
  );
};

export default DishImage;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
