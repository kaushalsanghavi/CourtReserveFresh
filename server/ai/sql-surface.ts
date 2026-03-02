export const SQL_RELATION_COLUMNS: Record<string, readonly string[]> = {
  ai_booking_facts: [
    "booking_id",
    "member_id",
    "member_name",
    "booking_date_text",
    "booking_date",
    "booking_created_at",
  ],
  ai_activity_facts: [
    "activity_id",
    "member_id",
    "member_name",
    "action",
    "activity_date_text",
    "activity_date",
    "device_info",
    "activity_hour",
    "activity_created_at",
  ],
  ai_member_facts: [
    "member_id",
    "name",
    "initials",
    "avatar_color",
    "member_created_at",
  ],
  ai_comment_facts: [
    "comment_id",
    "member_id",
    "member_name",
    "comment_date_text",
    "comment_date",
    "comment_text",
    "comment_created_at",
  ],
  bookings: ["id", "member_id", "member_name", "date", "created_at"],
  activities: [
    "id",
    "member_id",
    "member_name",
    "action",
    "date",
    "device_info",
    "created_at",
  ],
  members: ["id", "name", "initials", "avatar_color", "created_at"],
  comments: ["id", "member_id", "member_name", "date", "comment", "created_at"],
};

export const SQL_RELATIONS = Object.keys(SQL_RELATION_COLUMNS);

export function formatSqlSchemaDictionary(): string {
  return SQL_RELATIONS.map((relation) => {
    const columns = SQL_RELATION_COLUMNS[relation].join(", ");
    return `- ${relation}(${columns})`;
  }).join("\n");
}

export function getColumnsForRelation(relation: string): readonly string[] {
  return SQL_RELATION_COLUMNS[relation] ?? [];
}
