const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// uuid 列に不正な文字列を渡すと Postgres が型エラーで落ちるため、DB に渡す前に判定する
export function isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
}
