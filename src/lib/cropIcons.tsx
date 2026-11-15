import { Bean, Carrot, Citrus, Flower2, Leaf, Nut, Salad, Shovel, Sprout, TreePalm, Trees, Wheat, type LucideIcon } from 'lucide-react';

// One icon per kind of crop (open-source Lucide icons, ISC licence). Grouped by what the farmer harvests.
const BY_ID: Record<string, LucideIcon> = {
  rice: Wheat, salt_rice: Wheat, maize: Wheat, sorghum: Wheat,
  soybean: Bean, groundnut: Bean, green_gram: Bean, black_gram: Bean, cowpea: Bean, pigeon_pea: Bean, chickpea: Bean,
  sesame: Flower2, sunflower: Flower2,
  cassava: Carrot, potato: Carrot, sweet_potato: Carrot,
  sugarcane: Leaf,
  watermelon: Citrus, pineapple: Citrus,
  vegetables: Salad,
  cashew: Nut,
  oil_palm: TreePalm, rubber: Trees, perennial_tree: Trees,
  sunn_hemp: Sprout, cover_legume: Sprout,
  fallow: Shovel,
};

export const cropIcon = (id: string): LucideIcon => BY_ID[id] ?? Sprout;

export function CropIcon({ id, className }: { id: string; className?: string }) {
  const Icon = cropIcon(id);
  return <Icon className={className ?? 'h-4 w-4'} aria-hidden="true" />;
}
