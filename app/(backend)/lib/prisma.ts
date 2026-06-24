import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (process.platform === "linux" && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY =
    `${process.cwd()}/node_modules/prisma/libquery_engine-rhel-openssl-3.0.x.so.node`;
}

function getDatasourceUrl() {
  const datasourceUrl = process.env.DATABASE_URL;

  if (!datasourceUrl) {
    return undefined;
  }

  try {
    const url = new URL(datasourceUrl);

    if (
      url.hostname.endsWith(".pooler.supabase.com") &&
      url.port === "5432"
    ) {
      url.port = "6543";

      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
    }

    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        String(getPositiveIntegerEnv("PRISMA_CONNECTION_LIMIT", 1)),
      );
    }

    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set(
        "pool_timeout",
        String(getPositiveIntegerEnv("PRISMA_POOL_TIMEOUT_SECONDS", 20)),
      );
    }

    return url.toString();
  } catch {
    return datasourceUrl;
  }
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getDatasourceUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
