import { z } from 'zod';

export const importPartsSchema = z.object({
  assemblyId: z.uuid('Invalid assembly ID'),
  partsQuantity: z.coerce.number().int('必要数は整数で入力してください').min(1, '必要数は1以上で入力してください'),
  // FormData の File オブジェクト。ファイル未選択の場合は空の File が届くため、呼び出し側で除外する
  files: z.array(z.instanceof(File)).min(1, 'STLファイルを1つ以上選択してください'),
});

export const createAssemblySchema = z.object({
  name: z.string().trim().min(1, 'アセンブリ名を入力してください').max(255, 'アセンブリ名は255文字以内で入力してください'),
});

export const downloadSchema = z.object({
  kind: z.enum(['partInstance', 'part']),
  id: z.uuid('Invalid ID'),
});
