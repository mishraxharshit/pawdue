// A best guess at a dog's size class from its breed, used only to pre-select
// the size on the booking page. The owner can always change it, and the
// groomer's own size notes (Settings > Services) decide what the sizes mean.
const SIZE_BY_BREED = {
  "Poodle (Standard/Mini/Toy)": "medium",
  "Doodle (Goldendoodle/Labradoodle/etc)": "large",
  "Shih Tzu": "small",
  Maltese: "small",
  "Bichon Frise": "small",
  "Cocker Spaniel": "medium",
  "Yorkshire Terrier": "small",
  Schnauzer: "medium",
  "Old English Sheepdog": "large",
  "Golden Retriever": "large",
  "Labrador Retriever": "large",
  "German Shepherd": "large",
  Beagle: "medium",
  "Husky / Malamute": "large",
  Chihuahua: "small",
  Pug: "small",
  "Mixed / Unknown breed": "medium",
  "Other (short coat, low maintenance)": "medium",
};

/** "small" | "medium" | "large", or null when the breed is not recognised. */
export function suggestSize(breed) {
  return SIZE_BY_BREED[breed] || null;
}
