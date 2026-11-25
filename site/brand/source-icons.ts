// 來源的小圖示：檔名就是來源的 id（industry/sources.json），放進 sources/ 即可；沒有圖示的來源用名稱的第一個字。
// 圖示取自各來源網站自己的 favicon，商標屬於各來源。
const files = import.meta.glob<string>("./sources/*.png", { eager: true, import: "default", query: "?url&no-inline" });

const icons = new Map(Object.entries(files).map(([path, url]) => [path.slice("./sources/".length, -".png".length), url]));

/** 來源的圖示網址；沒有時為 null。 */
export function sourceIcon(id: string | undefined): string | null {
  return (id && icons.get(id)) || null;
}
