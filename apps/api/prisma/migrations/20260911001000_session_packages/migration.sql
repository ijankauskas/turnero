-- Packs de sesiones (bonos) por prestación y por cliente.
CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "session_count" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "validity_days" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_packages" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "service_package_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "total_sessions" INTEGER NOT NULL,
    "used_sessions" INTEGER NOT NULL DEFAULT 0,
    "price_paid" DECIMAL(12,2) NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "client_packages_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "appointments" ADD COLUMN "client_package_id" TEXT;
ALTER TABLE "appointments" ADD COLUMN "session_number" INTEGER;

CREATE INDEX "service_packages_company_id_service_id_idx" ON "service_packages"("company_id", "service_id");
CREATE INDEX "client_packages_company_id_client_id_idx" ON "client_packages"("company_id", "client_id");
CREATE INDEX "client_packages_company_id_service_id_idx" ON "client_packages"("company_id", "service_id");
CREATE INDEX "appointments_client_package_id_idx" ON "appointments"("client_package_id");

ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_service_package_id_fkey" FOREIGN KEY ("service_package_id") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_package_id_fkey" FOREIGN KEY ("client_package_id") REFERENCES "client_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
