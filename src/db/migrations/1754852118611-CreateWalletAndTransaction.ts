import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWalletAndTransaction1754852118611 implements MigrationInterface {
    name = 'CreateWalletAndTransaction1754852118611'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`transactions\` (\`id\` varchar(36) NOT NULL, \`walletId\` varchar(255) NOT NULL, \`type\` enum ('deposit', 'withdraw', 'transfer') NOT NULL, \`amount\` decimal(15,2) NOT NULL, \`status\` enum ('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`wallets\` (\`id\` varchar(36) NOT NULL, \`fullname\` varchar(150) NOT NULL, \`email\` varchar(150) NOT NULL, \`balance\` decimal(15,2) NOT NULL DEFAULT '0.00', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_a9edfee0de480472ba2aa95826\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`transactions\` ADD CONSTRAINT \`FK_a88f466d39796d3081cf96e1b66\` FOREIGN KEY (\`walletId\`) REFERENCES \`wallets\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`transactions\` DROP FOREIGN KEY \`FK_a88f466d39796d3081cf96e1b66\``);
        await queryRunner.query(`DROP INDEX \`IDX_a9edfee0de480472ba2aa95826\` ON \`wallets\``);
        await queryRunner.query(`DROP TABLE \`wallets\``);
        await queryRunner.query(`DROP TABLE \`transactions\``);
    }

}
