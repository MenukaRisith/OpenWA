import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSessionOwnerUserId1780012800000 implements MigrationInterface {
  name = 'AddSessionOwnerUserId1780012800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasSessions = await queryRunner.hasTable('sessions');
    if (!hasSessions) return;

    const hasOwner = await queryRunner.hasColumn('sessions', 'ownerUserId');
    if (hasOwner) return;

    await queryRunner.addColumn(
      'sessions',
      new TableColumn({
        name: 'ownerUserId',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasSessions = await queryRunner.hasTable('sessions');
    if (!hasSessions) return;

    const hasOwner = await queryRunner.hasColumn('sessions', 'ownerUserId');
    if (!hasOwner) return;

    await queryRunner.dropColumn('sessions', 'ownerUserId');
  }
}
