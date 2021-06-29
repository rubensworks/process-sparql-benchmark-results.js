import * as fs from 'fs-extra';

export async function instantiateTemplate(
  templatePath: string,
  outPath: string,
  values: Record<string, string | number>,
  modifier?: (contents: string) => string,
): Promise<void> {
  let contents = await fs.readFile(templatePath, 'utf8');
  for (const [ key, value ] of Object.entries(values)) {
    contents = contents.replace(new RegExp(`%${key}%`, 'gu'),
      typeof value === 'string' ? value : `${value}`);
  }
  if (modifier) {
    contents = modifier(contents);
  }
  await fs.writeFile(outPath, contents);
}
