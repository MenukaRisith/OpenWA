import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSessionTenantId1780012900000 implements MigrationInterface {
  name = 'AddSessionTenantId1780012900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasSessions = await queryRunner.hasTable('sessions');
    if (!hasSessions) return;

    const hasTenant = await queryRunner.hasColumn('sessions', 'tenantId');
    if (hasTenant) return;

    await queryRunner.addColumn(
      'sessions',
      new TableColumn({
        name: 'tenantId',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasSessions = await queryRunner.hasTable('sessions');
    if (!hasSessions) return;

    const hasTenant = await queryRunner.hasColumn('sessions', 'tenantId');
    if (!hasTenant) return;

    await queryRunner.dropColumn('sessions', 'tenantId');
  }
}
