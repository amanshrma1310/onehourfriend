import { prisma } from "./prisma";

let isDbInitialized = false;
let initPromise: Promise<void> | null = null;

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS \`User\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`username\` VARCHAR(191) NOT NULL UNIQUE,
    \`email\` VARCHAR(191) NULL UNIQUE,
    \`passwordHash\` VARCHAR(191) NULL,
    \`avatar\` VARCHAR(191) NOT NULL DEFAULT '🌙',
    \`bio\` TEXT NULL,
    \`activeRole\` VARCHAR(191) NOT NULL DEFAULT 'PROBLEM_FACER',
    \`preferredIntent\` VARCHAR(191) NOT NULL DEFAULT 'PEACE',
    \`preferredSocialGroup\` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    \`mood\` VARCHAR(191) NOT NULL DEFAULT 'Need to vent',
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'ONLINE',
    \`trustScore\` DOUBLE NOT NULL DEFAULT 5.0,
    \`karmaPoints\` INT NOT NULL DEFAULT 100,
    \`totalSessionsAsGuider\` INT NOT NULL DEFAULT 0,
    \`totalSessionsAsSeeker\` INT NOT NULL DEFAULT 0,
    \`isAnonymous\` BOOLEAN NOT NULL DEFAULT true,
    \`isBanned\` BOOLEAN NOT NULL DEFAULT false,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    \`lastSeen\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`Interest\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`name\` VARCHAR(191) NOT NULL UNIQUE,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`UserInterest\` (
    \`userId\` VARCHAR(191) NOT NULL,
    \`interestId\` VARCHAR(191) NOT NULL,
    PRIMARY KEY (\`userId\`, \`interestId\`),
    INDEX (\`interestId\`),
    CONSTRAINT \`fk_userinterest_user\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_userinterest_interest\` FOREIGN KEY (\`interestId\`) REFERENCES \`Interest\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`ConversationSession\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`userOneId\` VARCHAR(191) NOT NULL,
    \`userTwoId\` VARCHAR(191) NOT NULL,
    \`roleOne\` VARCHAR(191) NOT NULL DEFAULT 'PROBLEM_FACER',
    \`roleTwo\` VARCHAR(191) NOT NULL DEFAULT 'GUIDER',
    \`intent\` VARCHAR(191) NOT NULL DEFAULT 'PEACE',
    \`socialGroup\` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    \`topic\` VARCHAR(191) NOT NULL DEFAULT 'General',
    \`mood\` VARCHAR(191) NOT NULL DEFAULT 'General',
    \`problemSummary\` TEXT NULL,
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    \`matchedAt\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`startedAt\` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`expiresAt\` DATETIME(3) NULL,
    \`endedAt\` DATETIME(3) NULL,
    \`userOneKept\` BOOLEAN NOT NULL DEFAULT false,
    \`userTwoKept\` BOOLEAN NOT NULL DEFAULT false,
    \`isCompanion\` BOOLEAN NOT NULL DEFAULT false,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX (\`userOneId\`),
    INDEX (\`userTwoId\`),
    INDEX (\`status\`),
    INDEX (\`expiresAt\`),
    CONSTRAINT \`fk_session_userone\` FOREIGN KEY (\`userOneId\`) REFERENCES \`User\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT \`fk_session_usertwo\` FOREIGN KEY (\`userTwoId\`) REFERENCES \`User\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`Message\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`content\` TEXT NOT NULL,
    \`type\` VARCHAR(191) NOT NULL DEFAULT 'TEXT',
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX (\`sessionId\`, \`createdAt\`),
    INDEX (\`userId\`),
    CONSTRAINT \`fk_message_session\` FOREIGN KEY (\`sessionId\`) REFERENCES \`ConversationSession\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_message_user\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`Rating\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`sessionId\` VARCHAR(191) NOT NULL,
    \`fromUserId\` VARCHAR(191) NOT NULL,
    \`toUserId\` VARCHAR(191) NOT NULL,
    \`value\` INT NOT NULL DEFAULT 5,
    \`badges\` VARCHAR(191) NULL,
    \`comment\` TEXT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`uniq_session_from\` (\`sessionId\`, \`fromUserId\`),
    INDEX (\`toUserId\`),
    CONSTRAINT \`fk_rating_session\` FOREIGN KEY (\`sessionId\`) REFERENCES \`ConversationSession\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_rating_fromuser\` FOREIGN KEY (\`fromUserId\`) REFERENCES \`User\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT \`fk_rating_touser\` FOREIGN KEY (\`toUserId\`) REFERENCES \`User\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`Friendship\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`userOneId\` VARCHAR(191) NOT NULL,
    \`userTwoId\` VARCHAR(191) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`uniq_friendship\` (\`userOneId\`, \`userTwoId\`),
    CONSTRAINT \`fk_friendship_userone\` FOREIGN KEY (\`userOneId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_friendship_usertwo\` FOREIGN KEY (\`userTwoId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`FriendMessage\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`friendshipId\` VARCHAR(191) NOT NULL,
    \`senderId\` VARCHAR(191) NOT NULL,
    \`content\` TEXT NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX (\`friendshipId\`, \`createdAt\`),
    CONSTRAINT \`fk_friendmsg_friendship\` FOREIGN KEY (\`friendshipId\`) REFERENCES \`Friendship\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_friendmsg_sender\` FOREIGN KEY (\`senderId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`Block\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`blockerId\` VARCHAR(191) NOT NULL,
    \`blockedId\` VARCHAR(191) NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY \`uniq_block\` (\`blockerId\`, \`blockedId\`),
    INDEX (\`blockedId\`),
    CONSTRAINT \`fk_block_blocker\` FOREIGN KEY (\`blockerId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_block_blocked\` FOREIGN KEY (\`blockedId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`Report\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`reporterId\` VARCHAR(191) NOT NULL,
    \`reportedUserId\` VARCHAR(191) NOT NULL,
    \`reason\` VARCHAR(191) NOT NULL,
    \`description\` TEXT NULL,
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`reviewedAt\` DATETIME(3) NULL,
    INDEX (\`reportedUserId\`),
    INDEX (\`status\`),
    CONSTRAINT \`fk_report_reporter\` FOREIGN KEY (\`reporterId\`) REFERENCES \`User\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT \`fk_report_reported\` FOREIGN KEY (\`reportedUserId\`) REFERENCES \`User\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`MatchQueue\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`userId\` VARCHAR(191) NOT NULL UNIQUE,
    \`role\` VARCHAR(191) NOT NULL DEFAULT 'PROBLEM_FACER',
    \`intent\` VARCHAR(191) NOT NULL DEFAULT 'PEACE',
    \`socialGroup\` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    \`mood\` VARCHAR(191) NOT NULL DEFAULT 'General',
    \`problemSummary\` TEXT NULL,
    \`enteredAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX (\`role\`, \`intent\`, \`socialGroup\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`VentPost\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`userId\` VARCHAR(191) NOT NULL,
    \`anonymousName\` VARCHAR(191) NOT NULL,
    \`avatar\` VARCHAR(191) NOT NULL DEFAULT '🌙',
    \`content\` TEXT NOT NULL,
    \`category\` VARCHAR(191) NOT NULL DEFAULT 'Peace & Healing',
    \`mood\` VARCHAR(191) NOT NULL DEFAULT 'Need to vent',
    \`hugsCount\` INT NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX (\`createdAt\`),
    CONSTRAINT \`fk_ventpost_user\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`DailyQuestion\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`question\` TEXT NOT NULL,
    \`category\` VARCHAR(191) NOT NULL DEFAULT 'Deep Thoughts',
    \`date\` VARCHAR(191) NOT NULL UNIQUE,
    \`totalAnswers\` INT NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`DailyAnswer\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`questionId\` VARCHAR(191) NOT NULL,
    \`userId\` VARCHAR(191) NOT NULL,
    \`anonymousName\` VARCHAR(191) NOT NULL,
    \`avatar\` VARCHAR(191) NOT NULL DEFAULT '✨',
    \`answer\` TEXT NOT NULL,
    \`likesCount\` INT NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX (\`questionId\`, \`createdAt\`),
    CONSTRAINT \`fk_dailyans_question\` FOREIGN KEY (\`questionId\`) REFERENCES \`DailyQuestion\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT \`fk_dailyans_user\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS \`CallSignal\` (
    \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
    \`roomId\` VARCHAR(191) NOT NULL,
    \`senderId\` VARCHAR(191) NOT NULL,
    \`type\` VARCHAR(191) NOT NULL,
    \`payload\` LONGTEXT NOT NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX (\`roomId\`, \`createdAt\`),
    INDEX (\`senderId\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
];

export async function ensureDbTables() {
  if (isDbInitialized) return;

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      for (const sql of DDL_STATEMENTS) {
        await prisma.$executeRawUnsafe(sql);
      }
      isDbInitialized = true;
    } catch (e) {
      console.error("Auto table creation error:", e);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}
