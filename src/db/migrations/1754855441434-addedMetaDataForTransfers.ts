import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedMetaDataForTransfers1754855441434 implements MigrationInterface {
    name = 'AddedMetaDataForTransfers1754855441434'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`transactions\` ADD \`metadata\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`transactions\` DROP COLUMN \`metadata\``);
    }

}
