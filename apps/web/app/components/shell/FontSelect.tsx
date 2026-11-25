import { Select } from "../ui/Controls";
import { setFontPreference, useFontPreference } from "../../lib/local-state";
import { useT } from "../../lib/i18n";

/** The reader's font: the site's default or the browser's own (我的 page and the desktop 更多 menu). */
export function FontSelect() {
  const font = useFontPreference();
  const t = useT();
  return (
    <Select aria-label={t("字型", "Font")} value={font ?? "system"} onChange={(e) => setFontPreference(e.target.value === "browser" ? "browser" : null)}>
      <option value="system">{t("預設字型", "Default")}</option>
      <option value="browser">{t("瀏覽器預設字型", "Browser default")}</option>
    </Select>
  );
}
