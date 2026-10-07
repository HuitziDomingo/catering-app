import { experimental_AstroContainer as AstroContainer } from 'astro/container';

type Component = Parameters<AstroContainer['renderToString']>[0];

/** HTML renderizado de un componente .astro (sin dependencias de DOM extra). */
export async function render(component: Component, props: Record<string, unknown> = {}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(component, { props });
}

/** Atributos de cada etiqueta `tag` del HTML, como objetos. */
export function tags(html: string, tag: string): Record<string, string>[] {
  const result: Record<string, string>[] = [];
  for (const match of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))) {
    const attrs: Record<string, string> = {};
    for (const attr of match[1].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) {
      attrs[attr[1]] = attr[2] ?? '';
    }
    result.push(attrs);
  }
  return result;
}

/** Texto sin etiquetas, con espacios colapsados. */
export function text(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
