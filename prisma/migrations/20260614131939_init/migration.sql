-- CreateTable
CREATE TABLE "Organization" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "roleId"),
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enterprise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "creditCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalRepresentative" TEXT NOT NULL,
    "enterpriseType" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "foodCategory" TEXT NOT NULL,
    "businessStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "regulatoryDepartment" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "currentRiskLevel" TEXT NOT NULL DEFAULT 'B',
    "currentScore" DECIMAL NOT NULL DEFAULT 80.00,
    "riskTags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EnterpriseChangeLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enterpriseId" INTEGER NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "operator" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseChangeLog_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "License" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enterpriseId" INTEGER NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "issuingAgency" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "License_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enterpriseId" INTEGER NOT NULL,
    "taskCode" TEXT,
    "inspectionDate" DATETIME NOT NULL,
    "inspectors" TEXT NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "problemCount" INTEGER NOT NULL DEFAULT 0,
    "seriousProblem" BOOLEAN NOT NULL DEFAULT false,
    "problems" TEXT,
    "rectificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "rectificationDeadline" DATETIME,
    "reviewResult" TEXT,
    "attachments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inspection_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Penalty" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enterpriseId" INTEGER NOT NULL,
    "decisionNo" TEXT NOT NULL,
    "penaltyType" TEXT NOT NULL,
    "illegalFacts" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL DEFAULT 0.00,
    "penaltyDate" DATETIME NOT NULL,
    "executionStatus" TEXT NOT NULL,
    "foodSafetyMajorCase" BOOLEAN NOT NULL DEFAULT false,
    "seriousDishonesty" BOOLEAN NOT NULL DEFAULT false,
    "liftedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Penalty_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SampleTest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enterpriseId" INTEGER NOT NULL,
    "sampleNo" TEXT NOT NULL,
    "sampleDate" DATETIME NOT NULL,
    "foodCategory" TEXT NOT NULL,
    "sampleName" TEXT NOT NULL,
    "testItems" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "unqualifiedItem" TEXT,
    "disposalStatus" TEXT NOT NULL,
    "retestResult" TEXT,
    "publicStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SampleTest_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enterpriseId" INTEGER NOT NULL,
    "complaintNo" TEXT NOT NULL,
    "acceptedAt" DATETIME NOT NULL,
    "channel" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "feedbackAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Complaint_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditRepair" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enterpriseId" INTEGER NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "appliedAt" DATETIME NOT NULL,
    "repairItem" TEXT NOT NULL,
    "materials" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "conclusion" TEXT,
    "completedAt" DATETIME,
    "impactScope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreditRepair_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Indicator" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calculation" TEXT NOT NULL,
    "weight" DECIMAL NOT NULL,
    "threshold" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enterpriseType" TEXT,
    "dataSource" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScoreModel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "levelMapping" TEXT NOT NULL,
    "forceRules" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScoreRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enterpriseId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "indicatorVersion" TEXT NOT NULL,
    "score" DECIMAL NOT NULL,
    "level" TEXT NOT NULL,
    "previousLevel" TEXT,
    "details" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewer" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreRecord_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScoreRecord_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ScoreModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarningRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "warningType" TEXT NOT NULL,
    "conditionExpression" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "applicableCategory" TEXT,
    "handlingDays" INTEGER NOT NULL DEFAULT 7,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RiskWarning" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "warningNo" TEXT NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "warningType" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "judgement" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "handlingDept" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RiskWarning_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegulatoryTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskNo" TEXT NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "warningId" INTEGER,
    "title" TEXT NOT NULL,
    "matters" TEXT NOT NULL,
    "deadline" DATETIME NOT NULL,
    "executionDepartment" TEXT NOT NULL,
    "assigneeId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "rectificationRequest" TEXT,
    "reviewConclusion" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegulatoryTask_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegulatoryTask_warningId_fkey" FOREIGN KEY ("warningId") REFERENCES "RiskWarning" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RegulatoryTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataBatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batchNo" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceSystem" TEXT,
    "fileName" TEXT,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "qualitySummary" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SharedRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "target" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Enterprise_creditCode_key" ON "Enterprise"("creditCode");

-- CreateIndex
CREATE INDEX "Enterprise_name_idx" ON "Enterprise"("name");

-- CreateIndex
CREATE INDEX "Enterprise_region_idx" ON "Enterprise"("region");

-- CreateIndex
CREATE INDEX "Enterprise_currentRiskLevel_idx" ON "Enterprise"("currentRiskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "License_licenseNo_key" ON "License"("licenseNo");

-- CreateIndex
CREATE UNIQUE INDEX "Penalty_decisionNo_key" ON "Penalty"("decisionNo");

-- CreateIndex
CREATE UNIQUE INDEX "SampleTest_sampleNo_key" ON "SampleTest"("sampleNo");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_complaintNo_key" ON "Complaint"("complaintNo");

-- CreateIndex
CREATE UNIQUE INDEX "CreditRepair_applicationNo_key" ON "CreditRepair"("applicationNo");

-- CreateIndex
CREATE UNIQUE INDEX "Indicator_code_key" ON "Indicator"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreModel_version_key" ON "ScoreModel"("version");

-- CreateIndex
CREATE INDEX "ScoreRecord_enterpriseId_createdAt_idx" ON "ScoreRecord"("enterpriseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WarningRule_code_key" ON "WarningRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RiskWarning_warningNo_key" ON "RiskWarning"("warningNo");

-- CreateIndex
CREATE INDEX "RiskWarning_enterpriseId_idx" ON "RiskWarning"("enterpriseId");

-- CreateIndex
CREATE INDEX "RiskWarning_status_idx" ON "RiskWarning"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryTask_taskNo_key" ON "RegulatoryTask"("taskNo");

-- CreateIndex
CREATE INDEX "RegulatoryTask_status_idx" ON "RegulatoryTask"("status");

-- CreateIndex
CREATE INDEX "RegulatoryTask_enterpriseId_idx" ON "RegulatoryTask"("enterpriseId");

-- CreateIndex
CREATE UNIQUE INDEX "DataBatch_batchNo_key" ON "DataBatch"("batchNo");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
