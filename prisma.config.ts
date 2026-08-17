import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DATABASE_URL ||
      "mysql://u297792138_amandeepsharma:Ishu%401310@127.0.0.1:3306/u297792138_onehourfriend",
  },
});