/* Curated, verified Unsplash photography for the AIBN Chartered Accountants Ltd site.
   Used as CSS background-image (full-bleed, art-directed with overlays),
   so no next/image remote config is needed. Swap the IDs to rebrand. */

const BASE = "https://images.unsplash.com/photo-";

/** Build a sized, cropped Unsplash URL. Pass `h` for a fixed landscape crop. */
function u(id: string, w = 1600, q = 70, h?: number) {
  const size = h ? `w=${w}&h=${h}` : `w=${w}`;
  return `${BASE}${id}?auto=format&fit=crop&${size}&q=${q}`;
}

export const images = {
  /** Two professionals, handshake: home hero. */
  heroHandshake: u("1521791136064-7986c2920216", 1920),
  /** Business meeting around a table: business services. */
  meeting: u("1600880292203-757bb62b4baf", 1400),
  /** Desk with finance papers and laptop: individuals / tax. */
  deskFinance: u("1554224155-6726b3ff858f", 1400),
  /** Startup team at laptops: advisory / digital. */
  teamLaptops: u("1454165804606-c3d57bc86b40", 1400),
  /** Hand-drawn growth forecast on paper, pen + ruler: advisory / planning. */
  forecast: u("1543286386-2e659306cd6c", 1400),
  /** Modern open-plan office: about / firm. */
  office: u("1497215728101-856f4ea42174", 1400),
  /** Glass office tower: corporate page heroes. */
  tower: u("1486406146926-c627a92ad1ab", 1600),
  /** Architectural lines: alternate page hero. */
  architecture: u("1560179707-f14e90ef3623", 1600),
  /** Team meeting, candid: testimonials / contact. */
  teamMeeting: u("1521737604893-d14cc237f11d", 1400),
  /** Rolling green hills: the "harvest band" signature (farm metaphor). */
  fields: u("1444858291040-58f756a3bdd6", 1920),
  /** Misty forest path: quiet brand atmosphere. */
  forest: u("1507537297725-24a1c029d3ca", 1600),
  /** Rolling green Irish countryside at dusk: footer backdrop (wide crop). */
  footerLand: u("1444858291040-58f756a3bdd6", 1920, 70, 720),
} as const;

export type ImageKey = keyof typeof images;
