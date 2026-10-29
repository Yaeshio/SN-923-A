import { createTestAssembly, createTestPart, createTestPartInstance } from './index';

/**
 * 開発用のサンプルデータ: 1アセンブリ・3パーツ (うち1つは改訂 2 を持つ)。
 * ownerId には実在する auth.users の id を渡す (tests/seed.ts が Auth Admin API で作成する)。
 */
export async function seedDesignSamples(ownerId: string) {
    const assembly = await createTestAssembly({ ownerId, name: 'サンプルアセンブリ' });

    const bracket = await createTestPart({ assemblyId: assembly.id, modelName: 'bracket', partsQuantity: 2 });
    const cover = await createTestPart({ assemblyId: assembly.id, modelName: 'cover', partsQuantity: 1 });
    const hinge = await createTestPart({ assemblyId: assembly.id, modelName: 'hinge', partsQuantity: 4 });

    // bracket は設計修正して改訂 2 を追加した想定
    const bracketRev2 = await createTestPartInstance({
        partId: bracket.part.id,
        changeNote: 'サポートを追加',
    });

    return { assembly, parts: [bracket, cover, hinge], bracketRev2 };
}
