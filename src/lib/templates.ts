import { getDb, type TemplateRow } from "@/lib/db";

export type TemplateInput = {
  name: string;
  title?: string;
  body?: string;
  icon?: string;
  image?: string;
  url?: string;
  action1Title?: string;
  action1Url?: string;
  action2Title?: string;
  action2Url?: string;
};

export function createTemplate(t: TemplateInput): number {
  const info = getDb()
    .prepare(
      `INSERT INTO templates
        (name, title, body, icon, image, url, action1_title, action1_url, action2_title, action2_url)
       VALUES (@name, @title, @body, @icon, @image, @url, @action1_title, @action1_url, @action2_title, @action2_url)`
    )
    .run({
      name: t.name,
      title: t.title ?? null,
      body: t.body ?? null,
      icon: t.icon ?? null,
      image: t.image ?? null,
      url: t.url ?? null,
      action1_title: t.action1Title ?? null,
      action1_url: t.action1Url ?? null,
      action2_title: t.action2Title ?? null,
      action2_url: t.action2Url ?? null,
    });
  return Number(info.lastInsertRowid);
}

export function listTemplates(): TemplateRow[] {
  return getDb().prepare("SELECT * FROM templates ORDER BY id DESC").all() as TemplateRow[];
}

export function deleteTemplate(id: number): number {
  return getDb().prepare("DELETE FROM templates WHERE id = ?").run(id).changes;
}
