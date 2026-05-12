import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ayanshi Imitation BMS API",
      version: "1.0.0",
      description:
        "Backend API documentation for Ayanshi Imitation Business Management System. Built by Flowoid Technologies.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local Development Server",
      },
      {
        url: "http://140.245.193.49:3000",
        description: "Oracle VPS Production Server",
      },
    ],
    tags: [
      { name: "Health", description: "Service health checks" },
      { name: "Auth", description: "Authentication and session management" },
      { name: "Tenants", description: "Tenant and business onboarding" },
      { name: "Monitoring", description: "Admin system monitoring and live metrics" },
      { name: "Users", description: "User management" },
      { name: "Roles", description: "Role management" },
      { name: "Permissions", description: "Permission management" },
      { name: "Parties", description: "Tenant-scoped party master, opening balance, and statements" },
      { name: "Raw Materials", description: "Raw material types, purchases, issuances, and stock" },
      { name: "Design Categories", description: "Tenant-scoped design category master data" },
      { name: "Designs", description: "Jewellery design catalogue and design supplementary templates" },
      { name: "Supplementary Materials", description: "Tenant-scoped supplementary material master data and manual stock adjustments" },
      { name: "Workers", description: "Tenant-scoped worker profiles, summaries, assignments, payments, and ledger views" },
      { name: "Assignments", description: "Worker assignments with automatic raw material and supplementary issuances" },
      { name: "Goods Returns", description: "Batch returns of finished goods against worker assignments" },
      { name: "Inventory", description: "Finished goods stock, packaging batches, adjustments, and low stock alerts" },
      { name: "Orders", description: "Dealer orders, dispatches, packaged stock deduction, and sale ledger entries" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          security: [],
          responses: {
            200: {
              description: "API is running",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string", example: "OK" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/AuthUserSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Log in with email or phone",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/AuthUserSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh the current session",
          security: [{ refreshTokenCookie: [] }],
          responses: {
            200: { $ref: "#/components/responses/AuthUserSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Log out and revoke refresh token",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current user profile",
          responses: {
            200: { $ref: "#/components/responses/UserSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/my-permissions": {
        get: {
          tags: ["Auth"],
          summary: "Get current user permissions",
          responses: {
            200: {
              description: "User permissions retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/MyPermissionsResponse",
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/auth/change-password": {
        post: {
          tags: ["Auth"],
          summary: "Change current user password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/tenants": {
        post: {
          tags: ["Tenants"],
          summary: "Create tenant after user registration",
          description:
            "Creates a business tenant for the authenticated user and links the user as the first tenant user.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTenantRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/TenantSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/mine": {
        get: {
          tags: ["Tenants"],
          summary: "List current user's tenants",
          responses: {
            200: { $ref: "#/components/responses/TenantListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/api/monitoring/metrics": {
        get: {
          tags: ["Monitoring"],
          summary: "Get current system metrics",
          description:
            "Admin-only snapshot endpoint. For live admin panel updates, connect Socket.IO to namespace /admin-monitoring and listen for metrics:update. Clients may emit metrics:refresh to request an immediate update.",
          responses: {
            200: { $ref: "#/components/responses/MonitoringMetricsSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
      },
      "/api/users": {
        post: {
          tags: ["Users"],
          summary: "Create a user",
          description:
            "Creates a user. When roleId is provided, the authenticated user can only assign roles whose permissions are equal to or less than their own permissions. SUPER_ADMIN can assign any active role.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateUserRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/UserManagementSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
        get: {
          tags: ["Users"],
          summary: "List users",
          parameters: [
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Search by name, email, or phone",
            },
            {
              name: "roleId",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "isActive",
              in: "query",
              required: false,
              schema: { type: "boolean" },
            },
          ],
          responses: {
            200: { $ref: "#/components/responses/UserManagementListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
      },
      "/api/users/{id}": {
        parameters: [{ $ref: "#/components/parameters/IdPathParam" }],
        get: {
          tags: ["Users"],
          summary: "Get a user by ID",
          responses: {
            200: { $ref: "#/components/responses/UserManagementSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        put: {
          tags: ["Users"],
          summary: "Update a user",
          description:
            "Updates a user. When changing roleId, the authenticated user can only assign roles whose permissions are equal to or less than their own permissions. SUPER_ADMIN can assign any active role.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateUserRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/UserManagementSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Users"],
          summary: "Deactivate a user",
          description:
            "Soft-deactivates the user and revokes active sessions. It does not hard-delete user history.",
          responses: {
            200: { $ref: "#/components/responses/UserManagementSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/roles": {
        post: {
          tags: ["Roles"],
          summary: "Create a role",
          description:
            "Creates a role. Non-SUPER_ADMIN users can only include permissionIds they already have. Only SUPER_ADMIN can create system or default roles.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateRoleRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/RoleSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
        get: {
          tags: ["Roles"],
          summary: "List roles",
          description:
            "Lists roles visible to the authenticated user. Non-SUPER_ADMIN users only receive roles they can assign, meaning every permission on the role is already part of their own permissions.",
          responses: {
            200: { $ref: "#/components/responses/RoleListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
      },
      "/api/roles/{id}": {
        parameters: [{ $ref: "#/components/parameters/IdPathParam" }],
        get: {
          tags: ["Roles"],
          summary: "Get a role by ID",
          description:
            "Returns a role only if the authenticated user can view and assign it. Non-SUPER_ADMIN users cannot view roles with permissions beyond their own.",
          responses: {
            200: { $ref: "#/components/responses/RoleSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        put: {
          tags: ["Roles"],
          summary: "Update a role",
          description:
            "Updates a role. Non-SUPER_ADMIN users can only assign permissionIds they already have and cannot update system or default role flags.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateRoleRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/RoleSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Roles"],
          summary: "Delete a role",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/permissions": {
        post: {
          tags: ["Permissions"],
          summary: "Create a permission",
          description: "Creates a system permission. SUPER_ADMIN only.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreatePermissionRequest",
                },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/PermissionSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
        get: {
          tags: ["Permissions"],
          summary: "List permissions",
          description:
            "Lists permissions the authenticated user can assign. SUPER_ADMIN receives all permissions; other users only receive permissions already granted to their own role.",
          responses: {
            200: { $ref: "#/components/responses/PermissionListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
          },
        },
      },
      "/api/permissions/{id}": {
        parameters: [{ $ref: "#/components/parameters/IdPathParam" }],
        get: {
          tags: ["Permissions"],
          summary: "Get a permission by ID",
          description:
            "Returns a permission only if it is already granted to the authenticated user's role. SUPER_ADMIN can view any permission.",
          responses: {
            200: { $ref: "#/components/responses/PermissionSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        put: {
          tags: ["Permissions"],
          summary: "Update a permission",
          description: "Updates a system permission. SUPER_ADMIN only.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdatePermissionRequest",
                },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/PermissionSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Permissions"],
          summary: "Delete a permission",
          description: "Deletes a system permission. SUPER_ADMIN only.",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/parties": {
        parameters: [{ $ref: "#/components/parameters/TenantIdPathParam" }],
        post: {
          tags: ["Parties"],
          summary: "Create a party for a tenant",
          description:
            "Creates a dealer or supplier for the given tenant. If opening balance is provided, the API also creates the opening ledger entry automatically.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreatePartyRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/PartySuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        get: {
          tags: ["Parties"],
          summary: "List parties for a tenant",
          parameters: [
            { $ref: "#/components/parameters/PartyPageQueryParam" },
            { $ref: "#/components/parameters/PartyLimitQueryParam" },
            { $ref: "#/components/parameters/PartySearchQueryParam" },
            { $ref: "#/components/parameters/PartyTypeQueryParam" },
            { $ref: "#/components/parameters/PartyIsActiveQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/PartyListSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/parties/dropdown": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/PartySearchQueryParam" },
          { $ref: "#/components/parameters/PartyTypeQueryParam" },
          { $ref: "#/components/parameters/PartyIsActiveQueryParam" },
          { $ref: "#/components/parameters/PartyDropdownLimitQueryParam" },
        ],
        get: {
          tags: ["Parties"],
          summary: "Get lightweight party dropdown data",
          responses: {
            200: { $ref: "#/components/responses/PartyDropdownSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/parties/check-duplicate": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          {
            name: "name",
            in: "query",
            schema: { type: "string" },
            description: "Party name to check",
          },
          {
            name: "phone",
            in: "query",
            schema: { type: "string" },
            description: "Phone number to check",
          },
          {
            name: "code",
            in: "query",
            schema: { type: "string" },
            description: "Party code to check",
          },
          {
            name: "gstin",
            in: "query",
            schema: { type: "string" },
            description: "GSTIN to check",
          },
          {
            name: "excludePartyId",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Optional party ID to ignore during duplicate checks while updating",
          },
        ],
        get: {
          tags: ["Parties"],
          summary: "Check duplicate party fields within a tenant",
          description:
            "At least one of name, phone, code, or gstin must be provided. Use excludePartyId during updates so the record does not match itself.",
          responses: {
            200: { $ref: "#/components/responses/PartyDuplicateCheckSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/parties/{partyId}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/PartyIdPathParam" },
        ],
        get: {
          tags: ["Parties"],
          summary: "Get a party by ID",
          responses: {
            200: { $ref: "#/components/responses/PartySuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        put: {
          tags: ["Parties"],
          summary: "Update a party",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdatePartyRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/PartySuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Parties"],
          summary: "Soft delete a party",
          description:
            "Marks the party inactive and sets deletedAt. Ledger entries are preserved for accounting history.",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/parties/{partyId}/status": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/PartyIdPathParam" },
        ],
        patch: {
          tags: ["Parties"],
          summary: "Activate or deactivate a party",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdatePartyStatusRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/PartySuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/parties/{partyId}/opening-balance": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/PartyIdPathParam" },
        ],
        get: {
          tags: ["Parties"],
          summary: "Get opening balance details for a party",
          responses: {
            200: { $ref: "#/components/responses/OpeningBalanceSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Parties"],
          summary: "Create opening balance for a party",
          description:
            "Use this only once. If an opening balance already exists, call the update endpoint instead.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateOpeningBalanceRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/PartySuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        put: {
          tags: ["Parties"],
          summary: "Update opening balance for a party",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateOpeningBalanceRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/PartySuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/parties/{partyId}/statement": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/PartyIdPathParam" },
          { $ref: "#/components/parameters/StatementFromDateQueryParam" },
          { $ref: "#/components/parameters/StatementToDateQueryParam" },
          { $ref: "#/components/parameters/PartyPageQueryParam" },
          { $ref: "#/components/parameters/StatementLimitQueryParam" },
          { $ref: "#/components/parameters/IncludeOpeningEntryQueryParam" },
        ],
        get: {
          tags: ["Parties"],
          summary: "Get party statement",
          responses: {
            200: { $ref: "#/components/responses/PartyStatementSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/parties/{partyId}/ledger": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/PartyIdPathParam" },
          { $ref: "#/components/parameters/StatementFromDateQueryParam" },
          { $ref: "#/components/parameters/StatementToDateQueryParam" },
          { $ref: "#/components/parameters/PartyPageQueryParam" },
          { $ref: "#/components/parameters/StatementLimitQueryParam" },
          { $ref: "#/components/parameters/IncludeOpeningEntryQueryParam" },
        ],
        get: {
          tags: ["Parties"],
          summary: "Get party ledger",
          description:
            "Currently returns the same structure as the statement endpoint, sourced from party_ledger_entries.",
          responses: {
            200: { $ref: "#/components/responses/PartyStatementSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/raw-materials/types": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/RawMaterialPageQueryParam" },
          { $ref: "#/components/parameters/RawMaterialLimitQueryParam" },
          { $ref: "#/components/parameters/RawMaterialSearchQueryParam" },
          { $ref: "#/components/parameters/RawMaterialIsActiveQueryParam" },
        ],
        get: {
          tags: ["Raw Materials"],
          summary: "List raw material types",
          description: "Returns active material types with computed current stock.",
          responses: {
            200: { $ref: "#/components/responses/RawMaterialTypeListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Raw Materials"],
          summary: "Create a raw material type",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateRawMaterialTypeRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/RawMaterialTypeSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/raw-materials/types/{materialTypeId}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/RawMaterialTypeIdPathParam" },
        ],
        get: {
          tags: ["Raw Materials"],
          summary: "Get a raw material type",
          responses: {
            200: { $ref: "#/components/responses/RawMaterialTypeSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        patch: {
          tags: ["Raw Materials"],
          summary: "Update a raw material type",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateRawMaterialTypeRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/RawMaterialTypeSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Raw Materials"],
          summary: "Deactivate a raw material type",
          description: "Soft deletes the material type if no stock remains.",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: {
              description: "Deletion blocked due to remaining stock",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    remainingStock: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Cannot deactivate material type with remaining stock: 12.5 KG",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/raw-materials/purchases": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/RawMaterialPageQueryParam" },
          { $ref: "#/components/parameters/RawMaterialLimitQueryParam" },
          { $ref: "#/components/parameters/RawMaterialMaterialTypeIdQueryParam" },
          { $ref: "#/components/parameters/RawMaterialSupplierIdQueryParam" },
          { $ref: "#/components/parameters/RawMaterialPurchaseStatusQueryParam" },
          { $ref: "#/components/parameters/RawMaterialDateFromQueryParam" },
          { $ref: "#/components/parameters/RawMaterialDateToQueryParam" },
        ],
        get: {
          tags: ["Raw Materials"],
          summary: "List raw material purchases",
          responses: {
            200: { $ref: "#/components/responses/RawMaterialPurchaseListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Raw Materials"],
          summary: "Create a raw material purchase",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateRawMaterialPurchaseRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/RawMaterialPurchaseSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/raw-materials/purchases/{purchaseId}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/RawMaterialPurchaseIdPathParam" },
        ],
        get: {
          tags: ["Raw Materials"],
          summary: "Get a raw material purchase",
          responses: {
            200: { $ref: "#/components/responses/RawMaterialPurchaseSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        patch: {
          tags: ["Raw Materials"],
          summary: "Update a raw material purchase",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateRawMaterialPurchaseRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/RawMaterialPurchaseSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Raw Materials"],
          summary: "Delete a raw material purchase",
          description: "Soft deletes the purchase if it will not reduce stock below zero.",
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: {
              description: "Deletion blocked due to issued quantities",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    issuedQuantity: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Cannot delete purchase because issued quantity exceeds remaining stock",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/raw-materials/stock": {
        parameters: [{ $ref: "#/components/parameters/TenantIdPathParam" }],
        get: {
          tags: ["Raw Materials"],
          summary: "Get raw material stock summary",
          responses: {
            200: { $ref: "#/components/responses/RawMaterialStockSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/raw-materials/issuances": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/RawMaterialPageQueryParam" },
          { $ref: "#/components/parameters/RawMaterialLimitQueryParam" },
          { $ref: "#/components/parameters/RawMaterialMaterialTypeIdQueryParam" },
          { $ref: "#/components/parameters/RawMaterialReferenceIdQueryParam" },
          { $ref: "#/components/parameters/RawMaterialDateFromQueryParam" },
          { $ref: "#/components/parameters/RawMaterialDateToQueryParam" },
        ],
        get: {
          tags: ["Raw Materials"],
          summary: "List raw material issuances",
          responses: {
            200: { $ref: "#/components/responses/RawMaterialIssuanceListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Raw Materials"],
          summary: "Create a raw material issuance",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateRawMaterialIssuanceRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/RawMaterialIssuanceSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/raw-materials/issuances/{issuanceId}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/RawMaterialIssuanceIdPathParam" },
        ],
        get: {
          tags: ["Raw Materials"],
          summary: "Get a raw material issuance",
          responses: {
            200: { $ref: "#/components/responses/RawMaterialIssuanceSuccess" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/designs/categories": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
        ],
        get: {
          tags: ["Design Categories"],
          summary: "List design categories",
          description:
            "Returns tenant-scoped design categories ordered by sort order and name, with a count of non-deleted designs in each category.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/DesignPageQueryParam" },
            { $ref: "#/components/parameters/DesignLimitQueryParam" },
            { $ref: "#/components/parameters/DesignCategoryIsActiveQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/DesignCategoryListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Design Categories"],
          summary: "Create a design category",
          description:
            "Creates a tenant-scoped category such as Necklace, Earring, Bracelet, or Ring.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateDesignCategoryRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/DesignCategorySuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/designs/categories/{id}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/DesignCategoryIdPathParam" },
        ],
        get: {
          tags: ["Design Categories"],
          summary: "Get a design category by ID",
          description:
            "Returns one tenant-scoped design category with the count of non-deleted designs linked to it.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/DesignCategorySuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        patch: {
          tags: ["Design Categories"],
          summary: "Update a design category",
          description:
            "Updates category name, sort order, or active status for a tenant-scoped design category.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateDesignCategoryRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/DesignCategorySuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Design Categories"],
          summary: "Deactivate a design category",
          description:
            "Marks the category inactive. Deletion is blocked while non-deleted designs still reference it.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: {
              description: "Category deletion blocked due to linked designs",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    existingDesigns: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Cannot delete category with existing designs. Move designs first.",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/designs": {
        parameters: [{ $ref: "#/components/parameters/TenantIdPathParam" }],
        get: {
          tags: ["Designs"],
          summary: "List designs",
          description:
            "Returns tenant-scoped designs filtered by category, status, and free-text search across design code and name.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/DesignPageQueryParam" },
            { $ref: "#/components/parameters/DesignLimitQueryParam" },
            { $ref: "#/components/parameters/DesignCategoryIdQueryParam" },
            { $ref: "#/components/parameters/DesignStatusQueryParam" },
            { $ref: "#/components/parameters/DesignSearchQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/DesignListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Designs"],
          summary: "Create a design",
          description:
            "Creates a tenant-scoped design catalogue record with piece rate, diamond count, sale price, and lifecycle status.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateDesignRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/DesignSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/designs/{id}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/DesignIdPathParam" },
        ],
        get: {
          tags: ["Designs"],
          summary: "Get a design by ID",
          description:
            "Returns one non-deleted design with its category and supplementary material template rows.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/DesignSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        patch: {
          tags: ["Designs"],
          summary: "Update a design",
          description:
            "Updates design details, pricing, lifecycle status, category, or media URL for a non-deleted design.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateDesignRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/DesignSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Designs"],
          summary: "Soft delete a design",
          description:
            "Marks the design deleted. Deletion is blocked while any assignment is still open, issued, in progress, or partially returned.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: {
              description: "Design deletion blocked due to active assignments",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    activeAssignments: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message: "Cannot delete design with active assignments",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/designs/{id}/status": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/DesignIdPathParam" },
        ],
        patch: {
          tags: ["Designs"],
          summary: "Update design status",
          description:
            "Changes the lifecycle status of a design. Discontinuation is blocked while issued or in-progress assignments exist.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateDesignStatusRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/DesignSuccess" },
            400: {
              description: "Status update blocked due to active assignments",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    activeAssignments: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message: "Cannot discontinue design with active assignments",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/designs/{id}/supplementary-needs": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/DesignIdPathParam" },
        ],
        get: {
          tags: ["Designs"],
          summary: "List supplementary needs for a design",
          description:
            "Returns the per-piece supplementary material template rows configured for a design.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/DesignSupplementaryNeedListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Designs"],
          summary: "Add a supplementary need to a design",
          description:
            "Adds one material template row to a design, defining how much of a supplementary material is typically needed per finished piece.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateDesignSupplementaryNeedRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/DesignSupplementaryNeedSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/designs/{id}/supplementary-needs/{needId}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/DesignIdPathParam" },
          { $ref: "#/components/parameters/DesignNeedIdPathParam" },
        ],
        patch: {
          tags: ["Designs"],
          summary: "Update a design supplementary need",
          description:
            "Updates quantity per piece or notes for a design's supplementary material template row.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateDesignSupplementaryNeedRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/DesignSupplementaryNeedSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Designs"],
          summary: "Remove a design supplementary need",
          description: "Hard deletes a supplementary material template row from the design.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/supplementary": {
        parameters: [{ $ref: "#/components/parameters/TenantIdPathParam" }],
        get: {
          tags: ["Supplementary Materials"],
          summary: "List supplementary material types",
          description:
            "Returns tenant-scoped supplementary materials filtered by active status and free-text name search.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/SupplementaryPageQueryParam" },
            { $ref: "#/components/parameters/SupplementaryLimitQueryParam" },
            { $ref: "#/components/parameters/SupplementarySearchQueryParam" },
            { $ref: "#/components/parameters/SupplementaryIsActiveQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/SupplementaryMaterialTypeListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Supplementary Materials"],
          summary: "Create a supplementary material type",
          description:
            "Creates a tenant-scoped supplementary material such as stones, fittings, threads, or coatings, with manually tracked stock.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateSupplementaryMaterialTypeRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/SupplementaryMaterialTypeSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/supplementary/{id}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/SupplementaryMaterialTypeIdPathParam" },
        ],
        get: {
          tags: ["Supplementary Materials"],
          summary: "Get a supplementary material type by ID",
          description: "Returns one non-deleted supplementary material type.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/SupplementaryMaterialTypeSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        patch: {
          tags: ["Supplementary Materials"],
          summary: "Update a supplementary material type",
          description:
            "Updates the name, unit, description, or active status of a supplementary material type.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateSupplementaryMaterialTypeRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/SupplementaryMaterialTypeSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Supplementary Materials"],
          summary: "Soft delete a supplementary material type",
          description:
            "Marks the supplementary material inactive and deleted. Deletion is blocked while stock remains or the material is referenced by any design template.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: {
              description: "Deletion blocked due to remaining stock or design references",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    remainingStock: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Cannot delete supplementary material with remaining stock: 12.5000 pieces",
                          details: null,
                        },
                      },
                    },
                    designReferences: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message: "Cannot delete supplementary material referenced by 2 design(s)",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/supplementary/{id}/stock": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/SupplementaryMaterialTypeIdPathParam" },
        ],
        patch: {
          tags: ["Supplementary Materials"],
          summary: "Adjust supplementary material stock",
          description:
            "Manually increases or decreases stockQuantity for a supplementary material. Positive adjustments add stock and negative adjustments deduct stock.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdjustSupplementaryStockRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/SupplementaryMaterialTypeSuccess" },
            400: {
              description: "Stock adjustment would make inventory negative",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    negativeStock: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Adjustment would result in negative stock. Current stock: 4.0000 pieces",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/workers": {
        parameters: [{ $ref: "#/components/parameters/TenantIdPathParam" }],
        get: {
          tags: ["Workers"],
          summary: "List workers",
          description:
            "Returns tenant-scoped workers filtered by active status, search text, and city, along with the count of active assignments for each worker.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/WorkerPageQueryParam" },
            { $ref: "#/components/parameters/WorkerLimitQueryParam" },
            { $ref: "#/components/parameters/WorkerIsActiveQueryParam" },
            { $ref: "#/components/parameters/WorkerSearchQueryParam" },
            { $ref: "#/components/parameters/WorkerCityQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/WorkerListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Workers"],
          summary: "Create a worker",
          description:
            "Creates a worker profile including onboarding balance details for existing dues or advances.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateWorkerRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/WorkerSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/workers/payments": {
        parameters: [{ $ref: "#/components/parameters/TenantIdPathParam" }],
        get: {
          tags: ["Workers"],
          summary: "List worker payments across the tenant",
          description:
            "Returns worker payment records filtered by worker, payment type, and paid date range. Payment types are EARNING_SETTLEMENT for settling completed work, ADVANCE for early payout before work completion, and ADVANCE_RECOVERY for recovering a previously given advance from worker earnings.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/WorkerPaymentWorkerIdQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentTypeQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentDateFromQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentDateToQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentPageQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentLimitQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/WorkerPaymentListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Workers"],
          summary: "Record a worker payment",
          description:
            "Records a worker payment for an active worker. EARNING_SETTLEMENT pays completed earnings and cannot exceed the current outstanding balance. ADVANCE records an early payout before work completion. ADVANCE_RECOVERY records recovery of a prior advance from worker earnings and cannot exceed unrecovered advances. When paymentMode is omitted, it defaults to CASH.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateWorkerPaymentRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/CreateWorkerPaymentSuccess" },
            400: {
              description:
                "Worker payment blocked due to outstanding balance or unrecovered advance validation",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    outstandingExceeded: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Payment amount exceeds outstanding balance. Outstanding: 1500.00",
                          details: null,
                        },
                      },
                    },
                    advanceRecoveryExceeded: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Recovery amount exceeds total advance given. Total advance: 500.00",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/workers/payments/{paymentId}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/WorkerPaymentIdPathParam" },
        ],
        get: {
          tags: ["Workers"],
          summary: "Get a worker payment by ID",
          description:
            "Returns one worker payment with worker details and the user who recorded it.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/WorkerPaymentSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/workers/{id}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/WorkerIdPathParam" },
        ],
        get: {
          tags: ["Workers"],
          summary: "Get a worker by ID",
          description:
            "Returns one worker profile together with calculated summary fields such as total earned, total paid, outstanding balance, delivered pieces, and active assignments.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/WorkerDetailSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        patch: {
          tags: ["Workers"],
          summary: "Update a worker",
          description:
            "Updates worker profile details, onboarding balance information, and notes.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateWorkerRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/WorkerSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        delete: {
          tags: ["Workers"],
          summary: "Soft delete a worker",
          description:
            "Marks the worker inactive and deleted. Deletion is blocked while the worker still has active assignments.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/MessageSuccess" },
            400: {
              description: "Worker deletion blocked due to active assignments",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    activeAssignments: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Cannot delete worker with active assignments. Complete or close assignments first.",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/workers/{id}/assignments": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/WorkerIdPathParam" },
        ],
        get: {
          tags: ["Workers"],
          summary: "List assignments for a worker",
          description:
            "Returns assignments for one worker, optionally filtered by assignment status, including design and raw material details.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/WorkerAssignmentStatusQueryParam" },
            { $ref: "#/components/parameters/WorkerAssignmentPageQueryParam" },
            { $ref: "#/components/parameters/WorkerAssignmentLimitQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/WorkerAssignmentListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/workers/{id}/payments": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/WorkerIdPathParam" },
        ],
        get: {
          tags: ["Workers"],
          summary: "List payments for a worker",
          description:
            "Returns worker payment records filtered by payment type and payment date range.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/WorkerPaymentTypeQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentDateFromQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentDateToQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentPageQueryParam" },
            { $ref: "#/components/parameters/WorkerPaymentLimitQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/WorkerPaymentListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/workers/{id}/ledger": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/WorkerIdPathParam" },
        ],
        get: {
          tags: ["Workers"],
          summary: "Get worker ledger",
          description:
            "Returns a chronological worker ledger built from opening balance, goods return earnings, and worker payment entries, with running balance after each row.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/WorkerLedgerSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/assignments": {
        parameters: [{ $ref: "#/components/parameters/TenantIdPathParam" }],
        get: {
          tags: ["Assignments"],
          summary: "List worker assignments",
          description:
            "Returns assignments filtered by worker, design, status, and issued date range.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/AssignmentPageQueryParam" },
            { $ref: "#/components/parameters/AssignmentLimitQueryParam" },
            { $ref: "#/components/parameters/AssignmentWorkerIdQueryParam" },
            { $ref: "#/components/parameters/AssignmentDesignIdQueryParam" },
            { $ref: "#/components/parameters/AssignmentStatusQueryParam" },
            { $ref: "#/components/parameters/AssignmentDateFromQueryParam" },
            { $ref: "#/components/parameters/AssignmentDateToQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/WorkerAssignmentListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        post: {
          tags: ["Assignments"],
          summary: "Create a worker assignment",
          description:
            "Creates a worker assignment atomically. Supplementary issuances are calculated automatically from the design's supplementary template and deducted from supplementary stock inside the same transaction.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateAssignmentRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/WorkerAssignmentSuccess" },
            400: {
              description: "Assignment creation blocked due to stock validation or invalid state",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    insufficientRawMaterial: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Insufficient raw material stock. Available: 12.5000 KG, Requested: 15 KG",
                          details: null,
                        },
                      },
                    },
                    insufficientSupplementary: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Insufficient stock for White Round Stones 3mm. Available: 100.0000 pieces, Required: 120.0000 pieces",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/assignments/goods-returns": {
        parameters: [{ $ref: "#/components/parameters/TenantIdPathParam" }],
        get: {
          tags: ["Goods Returns"],
          summary: "List goods returns",
          description:
            "Returns goods return batches across assignments, optionally filtered by assignment, worker, and return date range.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/GoodsReturnPageQueryParam" },
            { $ref: "#/components/parameters/GoodsReturnLimitQueryParam" },
            { $ref: "#/components/parameters/GoodsReturnAssignmentIdQueryParam" },
            { $ref: "#/components/parameters/GoodsReturnWorkerIdQueryParam" },
            { $ref: "#/components/parameters/GoodsReturnDateFromQueryParam" },
            { $ref: "#/components/parameters/GoodsReturnDateToQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/GoodsReturnListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/assignments/goods-returns/{returnId}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/GoodsReturnIdPathParam" },
        ],
        get: {
          tags: ["Goods Returns"],
          summary: "Get a goods return by ID",
          description:
            "Returns a single goods return record with assignment, worker, and design context.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/GoodsReturnSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/assignments/{id}": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/AssignmentIdPathParam" },
        ],
        get: {
          tags: ["Assignments"],
          summary: "Get an assignment by ID",
          description:
            "Returns one assignment with worker, design, raw material issuance, supplementary issuances, and chronological goods returns.",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { $ref: "#/components/responses/WorkerAssignmentSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        patch: {
          tags: ["Assignments"],
          summary: "Update assignment notes or expected return date",
          description:
            "Updates only the expected return date or notes for a non-terminal assignment.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateAssignmentRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/WorkerAssignmentSuccess" },
            400: {
              description: "Assignment update blocked due to terminal status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    terminalAssignment: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message: "Cannot update a completed or closed assignment",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/assignments/{id}/status": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/AssignmentIdPathParam" },
        ],
        patch: {
          tags: ["Assignments"],
          summary: "Mark an assignment as in progress",
          description:
            "Manual status transition from ISSUED to IN_PROGRESS. All other assignment status transitions happen automatically or through the close endpoint.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateAssignmentStatusRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/WorkerAssignmentSuccess" },
            400: {
              description: "Invalid assignment status transition",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    invalidStatusTransition: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message:
                            "Assignment must be in ISSUED status to mark as in progress",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/assignments/{id}/close": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/AssignmentIdPathParam" },
        ],
        patch: {
          tags: ["Assignments"],
          summary: "Force close an assignment",
          description:
            "Closes a non-terminal assignment and requires a reason in notes. Completed and closed assignments cannot be closed again.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CloseAssignmentRequest" },
              },
            },
          },
          responses: {
            200: { $ref: "#/components/responses/WorkerAssignmentSuccess" },
            400: {
              description: "Assignment is already terminal or notes are missing",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    alreadyTerminal: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message: "Assignment is already completed or closed",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
      "/api/tenants/{tenantId}/assignments/{id}/returns": {
        parameters: [
          { $ref: "#/components/parameters/TenantIdPathParam" },
          { $ref: "#/components/parameters/AssignmentIdPathParam" },
        ],
        post: {
          tags: ["Goods Returns"],
          summary: "Record a goods return batch",
          description:
            "Records a goods return in a transaction, updates earned amount and returned piece counts, and automatically moves the assignment to PARTIALLY_RETURNED or COMPLETED based on cumulative accepted pieces.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateGoodsReturnRequest" },
              },
            },
          },
          responses: {
            201: { $ref: "#/components/responses/GoodsReturnRecordSuccess" },
            400: {
              description:
                "Goods return blocked due to validation or terminal assignment status",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                  examples: {
                    missingRejectionNotes: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message: "Request validation failed",
                          details: {
                            fieldErrors: {
                              rejectionNotes: [
                                "Rejection notes are required when rejected pieces are greater than 0",
                              ],
                            },
                          },
                        },
                      },
                    },
                    terminalAssignment: {
                      value: {
                        success: false,
                        error: {
                          code: "VALIDATION_ERROR",
                          message: "Cannot record return for a completed or closed assignment",
                          details: null,
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
        get: {
          tags: ["Goods Returns"],
          summary: "List goods returns for one assignment",
          description:
            "Returns chronological goods return batches for a single assignment. Useful for batch-by-batch production tracking.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/GoodsReturnDateFromQueryParam" },
            { $ref: "#/components/parameters/GoodsReturnDateToQueryParam" },
          ],
          responses: {
            200: { $ref: "#/components/responses/AssignmentGoodsReturnListSuccess" },
            400: { $ref: "#/components/responses/ValidationError" },
            401: { $ref: "#/components/responses/UnauthorizedError" },
            403: { $ref: "#/components/responses/ForbiddenError" },
            404: { $ref: "#/components/responses/NotFoundError" },
          },
        },
      },
    },
    components: {
      parameters: {
        IdPathParam: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Resource ID",
        },
        TenantIdPathParam: {
          name: "tenantId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Tenant ID",
        },
        OrderIdPathParam: {
          name: "orderId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Order ID",
        },
        OrderItemIdPathParam: {
          name: "itemId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Order item ID",
        },
        PartyIdPathParam: {
          name: "partyId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Party ID",
        },
        PartyPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        PartyLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
        StatementLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
          description: "Number of ledger entries per page",
        },
        PartyDropdownLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
          description: "Maximum dropdown items to return",
        },
        PartySearchQueryParam: {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Free-text search across name, code, phone, email, GSTIN, and contact person",
        },
        PartyTypeQueryParam: {
          name: "type",
          in: "query",
          schema: { type: "string", enum: ["DEALER", "SUPPLIER"] },
          description: "Filter by party type",
        },
        PartyIsActiveQueryParam: {
          name: "isActive",
          in: "query",
          schema: { type: "boolean" },
          description: "Filter by active or inactive status",
        },
        StatementFromDateQueryParam: {
          name: "fromDate",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include ledger entries from this date-time onward",
        },
        StatementToDateQueryParam: {
          name: "toDate",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include ledger entries up to this date-time",
        },
        IncludeOpeningEntryQueryParam: {
          name: "includeOpeningEntry",
          in: "query",
          schema: { type: "boolean", default: true },
          description: "Include or exclude the generated opening balance ledger entry",
        },
        RawMaterialTypeIdPathParam: {
          name: "materialTypeId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Raw material type ID",
        },
        RawMaterialPurchaseIdPathParam: {
          name: "purchaseId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Raw material purchase ID",
        },
        RawMaterialIssuanceIdPathParam: {
          name: "issuanceId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Raw material issuance ID",
        },
        RawMaterialPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        RawMaterialLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
        RawMaterialSearchQueryParam: {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search by material type name",
        },
        RawMaterialIsActiveQueryParam: {
          name: "isActive",
          in: "query",
          schema: { type: "boolean" },
          description: "Filter by active or inactive status",
        },
        RawMaterialMaterialTypeIdQueryParam: {
          name: "materialTypeId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter by material type ID",
        },
        RawMaterialSupplierIdQueryParam: {
          name: "supplierId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter by supplier ID",
        },
        RawMaterialPurchaseStatusQueryParam: {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["PENDING", "RECEIVED", "CANCELLED"],
          },
          description: "Filter by purchase status",
        },
        RawMaterialDateFromQueryParam: {
          name: "dateFrom",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include records from this date-time onward",
        },
        RawMaterialDateToQueryParam: {
          name: "dateTo",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include records up to this date-time",
        },
        RawMaterialReferenceIdQueryParam: {
          name: "referenceId",
          in: "query",
          schema: { type: "string" },
          description: "Filter issuances by reference ID",
        },
        DesignCategoryIdPathParam: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Design category ID",
        },
        DesignIdPathParam: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Design ID",
        },
        DesignNeedIdPathParam: {
          name: "needId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Design supplementary need ID",
        },
        SupplementaryMaterialTypeIdPathParam: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Supplementary material type ID",
        },
        DesignPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        DesignLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
        DesignSearchQueryParam: {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search by design code or design name",
        },
        DesignCategoryIsActiveQueryParam: {
          name: "isActive",
          in: "query",
          schema: { type: "boolean" },
          description: "Filter categories by active or inactive status",
        },
        DesignCategoryIdQueryParam: {
          name: "categoryId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter designs by category ID",
        },
        DesignStatusQueryParam: {
          name: "status",
          in: "query",
          schema: { $ref: "#/components/schemas/DesignStatus" },
          description: "Filter designs by lifecycle status",
        },
        SupplementaryPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        SupplementaryLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
        SupplementarySearchQueryParam: {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search by supplementary material name",
        },
        SupplementaryIsActiveQueryParam: {
          name: "isActive",
          in: "query",
          schema: { type: "boolean" },
          description: "Filter supplementary materials by active or inactive status",
        },
        WorkerIdPathParam: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Worker ID",
        },
        WorkerPaymentIdPathParam: {
          name: "paymentId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Worker payment ID",
        },
        WorkerPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        WorkerLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
        WorkerIsActiveQueryParam: {
          name: "isActive",
          in: "query",
          schema: { type: "boolean" },
          description: "Filter workers by active or inactive status",
        },
        WorkerSearchQueryParam: {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search by worker name or phone",
        },
        WorkerCityQueryParam: {
          name: "city",
          in: "query",
          schema: { type: "string" },
          description: "Filter workers by city",
        },
        WorkerAssignmentStatusQueryParam: {
          name: "status",
          in: "query",
          schema: { $ref: "#/components/schemas/AssignmentStatus" },
          description: "Filter worker assignments by status",
        },
        WorkerAssignmentPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        WorkerAssignmentLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
        WorkerPaymentTypeQueryParam: {
          name: "paymentType",
          in: "query",
          schema: { $ref: "#/components/schemas/WorkerPaymentType" },
          description: "Filter worker payments by payment type",
        },
        WorkerPaymentWorkerIdQueryParam: {
          name: "workerId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter worker payments for a specific worker",
        },
        WorkerPaymentDateFromQueryParam: {
          name: "dateFrom",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include worker payments from this date-time onward",
        },
        WorkerPaymentDateToQueryParam: {
          name: "dateTo",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include worker payments up to this date-time",
        },
        WorkerPaymentPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        WorkerPaymentLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
        AssignmentIdPathParam: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Assignment ID",
        },
        GoodsReturnIdPathParam: {
          name: "returnId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Goods return ID",
        },
        AssignmentPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        AssignmentLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
        AssignmentWorkerIdQueryParam: {
          name: "workerId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter assignments by worker ID",
        },
        AssignmentDesignIdQueryParam: {
          name: "designId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter assignments by design ID",
        },
        AssignmentStatusQueryParam: {
          name: "status",
          in: "query",
          schema: { $ref: "#/components/schemas/AssignmentStatus" },
          description: "Filter assignments by status",
        },
        AssignmentDateFromQueryParam: {
          name: "dateFrom",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include assignments issued from this date-time onward",
        },
        AssignmentDateToQueryParam: {
          name: "dateTo",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include assignments issued up to this date-time",
        },
        GoodsReturnAssignmentIdQueryParam: {
          name: "assignmentId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter goods returns by assignment ID",
        },
        GoodsReturnWorkerIdQueryParam: {
          name: "workerId",
          in: "query",
          schema: { type: "string", format: "uuid" },
          description: "Filter goods returns by worker ID",
        },
        GoodsReturnDateFromQueryParam: {
          name: "dateFrom",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include goods returns from this date-time onward",
        },
        GoodsReturnDateToQueryParam: {
          name: "dateTo",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Include goods returns up to this date-time",
        },
        GoodsReturnPageQueryParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number",
        },
        GoodsReturnLimitQueryParam: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          description: "Number of records per page",
        },
      },
      responses: {
        AuthUserSuccess: {
          description:
            "Authenticated user response. Authentication cookies are set on successful auth operations.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthSessionResponse" },
            },
          },
        },
        UserSuccess: {
          description: "User response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserResponse" },
            },
          },
        },
        UserManagementSuccess: {
          description: "User management response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserManagementResponse" },
            },
          },
        },
        UserManagementListSuccess: {
          description: "User management list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserManagementListResponse" },
            },
          },
        },
        MessageSuccess: {
          description: "Message response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MessageResponse" },
            },
          },
        },
        TenantSuccess: {
          description: "Tenant response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TenantResponse" },
            },
          },
        },
        TenantListSuccess: {
          description: "Tenant list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TenantListResponse" },
            },
          },
        },
        MonitoringMetricsSuccess: {
          description: "System monitoring metrics response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MonitoringMetricsResponse" },
            },
          },
        },
        RoleSuccess: {
          description: "Role response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoleResponse" },
            },
          },
        },
        RoleListSuccess: {
          description: "Role list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoleListResponse" },
            },
          },
        },
        PermissionSuccess: {
          description: "Permission response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PermissionResponse" },
            },
          },
        },
        PermissionListSuccess: {
          description: "Permission list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PermissionListResponse" },
            },
          },
        },
        PartySuccess: {
          description: "Party response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PartyResponse" },
            },
          },
        },
        PartyListSuccess: {
          description: "Paginated party list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PartyListResponse" },
            },
          },
        },
        PartyDropdownSuccess: {
          description: "Lightweight dropdown list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PartyDropdownResponse" },
            },
          },
        },
        PartyDuplicateCheckSuccess: {
          description: "Duplicate check response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PartyDuplicateCheckResponse" },
            },
          },
        },
        OpeningBalanceSuccess: {
          description: "Opening balance response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OpeningBalanceResponse" },
            },
          },
        },
        PartyStatementSuccess: {
          description: "Party statement or ledger response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PartyStatementResponse" },
            },
          },
        },
        RawMaterialTypeSuccess: {
          description: "Raw material type response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RawMaterialTypeResponse" },
            },
          },
        },
        RawMaterialTypeListSuccess: {
          description: "Raw material type list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RawMaterialTypeListResponse" },
            },
          },
        },
        RawMaterialPurchaseSuccess: {
          description: "Raw material purchase response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RawMaterialPurchaseResponse" },
            },
          },
        },
        RawMaterialPurchaseListSuccess: {
          description: "Raw material purchase list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RawMaterialPurchaseListResponse" },
            },
          },
        },
        RawMaterialIssuanceSuccess: {
          description: "Raw material issuance response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RawMaterialIssuanceResponse" },
            },
          },
        },
        RawMaterialIssuanceListSuccess: {
          description: "Raw material issuance list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RawMaterialIssuanceListResponse" },
            },
          },
        },
        RawMaterialStockSuccess: {
          description: "Raw material stock response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RawMaterialStockResponse" },
            },
          },
        },
        DesignCategorySuccess: {
          description: "Design category response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DesignCategoryResponse" },
            },
          },
        },
        DesignCategoryListSuccess: {
          description: "Design category list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DesignCategoryListResponse" },
            },
          },
        },
        DesignSuccess: {
          description: "Design response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DesignResponse" },
            },
          },
        },
        DesignListSuccess: {
          description: "Design list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DesignListResponse" },
            },
          },
        },
        DesignSupplementaryNeedSuccess: {
          description: "Design supplementary need response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DesignSupplementaryNeedResponse" },
            },
          },
        },
        DesignSupplementaryNeedListSuccess: {
          description: "Design supplementary need list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DesignSupplementaryNeedListResponse" },
            },
          },
        },
        SupplementaryMaterialTypeSuccess: {
          description: "Supplementary material type response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SupplementaryMaterialTypeResponse" },
            },
          },
        },
        SupplementaryMaterialTypeListSuccess: {
          description: "Supplementary material type list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SupplementaryMaterialTypeListResponse" },
            },
          },
        },
        WorkerSuccess: {
          description: "Worker response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerResponse" },
            },
          },
        },
        WorkerDetailSuccess: {
          description: "Worker detail response with summary",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerDetailResponse" },
            },
          },
        },
        WorkerListSuccess: {
          description: "Worker list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerListResponse" },
            },
          },
        },
        WorkerAssignmentListSuccess: {
          description: "Worker assignment list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerAssignmentListResponse" },
            },
          },
        },
        WorkerPaymentListSuccess: {
          description: "Worker payment list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerPaymentListResponse" },
            },
          },
        },
        WorkerPaymentSuccess: {
          description: "Worker payment response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerPaymentResponse" },
            },
          },
        },
        CreateWorkerPaymentSuccess: {
          description: "Worker payment created successfully with refreshed outstanding summary",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateWorkerPaymentResponse" },
            },
          },
        },
        WorkerLedgerSuccess: {
          description: "Worker ledger response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerLedgerResponse" },
            },
          },
        },
        WorkerAssignmentSuccess: {
          description: "Worker assignment response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkerAssignmentResponse" },
            },
          },
        },
        AssignmentGoodsReturnListSuccess: {
          description: "Goods return list for a single assignment",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AssignmentGoodsReturnListResponse" },
            },
          },
        },
        GoodsReturnSuccess: {
          description: "Goods return response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GoodsReturnResponse" },
            },
          },
        },
        GoodsReturnListSuccess: {
          description: "Paginated goods return list response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GoodsReturnListResponse" },
            },
          },
        },
        GoodsReturnRecordSuccess: {
          description: "Goods return creation response with updated assignment summary",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GoodsReturnRecordResponse" },
            },
          },
        },
        InventoryStockSuccess: {
          description: "Inventory stock response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InventoryStockResponse" },
            },
          },
        },
        InventoryStockDetailSuccess: {
          description: "Inventory stock detail with packaging history",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InventoryStockDetailResponse" },
            },
          },
        },
        InventoryStockListSuccess: {
          description: "Paginated inventory stock overview",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InventoryStockListResponse" },
            },
          },
        },
        InventoryLowStockAlertListSuccess: {
          description: "Low stock inventory alert list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InventoryLowStockAlertListResponse" },
            },
          },
        },
        PackagingBatchSuccess: {
          description: "Packaging batch response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PackagingBatchResponse" },
            },
          },
        },
        PackagingBatchListSuccess: {
          description: "Paginated packaging batch list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PackagingBatchListResponse" },
            },
          },
        },
        PackagingBatchCreateSuccess: {
          description: "Packaging batch created with updated stock summary",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PackagingBatchCreateResponse" },
            },
          },
        },
        InventoryAdjustmentCreateSuccess: {
          description: "Inventory adjustment created with updated stock summary",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InventoryAdjustmentCreateResponse" },
            },
          },
        },
        OrderSuccess: {
          description: "Order response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderResponse" },
            },
          },
        },
        OrderListSuccess: {
          description: "Paginated order list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderListResponse" },
            },
          },
        },
        OverdueOrderListSuccess: {
          description: "Overdue order list",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OverdueOrderListResponse" },
            },
          },
        },
        OrderDispatchSummarySuccess: {
          description: "Printable order dispatch summary",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderDispatchSummaryResponse" },
            },
          },
        },
        ValidationError: {
          description: "Validation error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        UnauthorizedError: {
          description: "Authentication error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ForbiddenError: {
          description: "Authorization error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
      securitySchemes: {
        accessTokenCookie: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description:
            "Primary authentication method for browser clients. This HTTP-only cookie is issued by POST /api/auth/login and rotated through POST /api/auth/refresh.",
        },
        refreshTokenCookie: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
          description:
            "Refresh-session cookie used only by POST /api/auth/refresh. It is HTTP-only, long-lived, and rotated on every refresh.",
        },
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Optional fallback for non-browser clients. The backend also accepts Authorization: Bearer <access-token> for access-token protected routes.",
        },
      },
      schemas: {
        RegisterRequest: {
          type: "object",
          required: ["name", "phone", "password"],
          properties: {
            name: { type: "string", minLength: 2, example: "Ravi Shah" },
            email: {
              type: "string",
              format: "email",
              example: "ravi@flowoid.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            password: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "password123",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "ravi@flowoid.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            password: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "password123",
            },
          },
          description: "Provide either email or phone with the password.",
        },
        RefreshRequest: {
          type: "object",
          properties: {
            refreshToken: {
              type: "string",
              description: "Optional when refreshToken cookie is present.",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "oldPassword123",
            },
            newPassword: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "newPassword123",
            },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["name", "phone", "password"],
          properties: {
            name: { type: "string", minLength: 2, example: "Vatsal Shah" },
            email: {
              type: "string",
              format: "email",
              example: "vatsal@flowoid.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            password: {
              type: "string",
              minLength: 8,
              format: "password",
              example: "password123",
            },
            roleId: {
              type: "string",
              format: "uuid",
              description:
                "Optional. If omitted, the backend uses the active default role. The selected role must not contain permissions beyond the authenticated user's own permissions, unless the authenticated user is SUPER_ADMIN.",
            },
            isActive: { type: "boolean", example: true },
          },
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, example: "Vatsal Shah" },
            email: {
              type: "string",
              format: "email",
              nullable: true,
              example: "vatsal@flowoid.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            password: {
              type: "string",
              minLength: 8,
              format: "password",
              description: "Optional admin password reset. Active sessions are revoked when changed.",
              example: "newPassword123",
            },
            roleId: {
              type: "string",
              format: "uuid",
              description:
                "The selected role must not contain permissions beyond the authenticated user's own permissions, unless the authenticated user is SUPER_ADMIN.",
            },
            isActive: { type: "boolean", example: true },
          },
        },
        CreateTenantRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              minLength: 2,
              example: "Ayanshi Imitation",
            },
            slug: {
              type: "string",
              minLength: 2,
              example: "ayanshi-imitation",
              description:
                "Optional. If omitted, the backend generates a slug from the tenant name. The slug must be unique.",
            },
            email: {
              type: "string",
              format: "email",
              example: "contact@ayanshi.com",
            },
            phone: { type: "string", minLength: 6, example: "9876543210" },
            address: {
              type: "string",
              example: "Ahmedabad, Gujarat",
            },
            logoUrl: {
              type: "string",
              format: "uri",
              example: "https://example.com/logo.png",
            },
            businessCategory: {
              type: "string",
              example: "Imitation Jewellery",
            },
          },
        },
        CreateRoleRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 2, example: "Cashier" },
            description: {
              type: "string",
              example: "Handles billing and payment operations",
            },
            permissionIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description:
                "Permission IDs to grant to this role. Non-SUPER_ADMIN users can only include permissions they already have.",
            },
          },
        },
        UpdateRoleRequest: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, example: "Senior Cashier" },
            description: {
              type: "string",
              example: "Handles billing, payment, and reports",
            },
            isActive: { type: "boolean", example: true },
            permissionIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description:
                "Replacement permission IDs for this role. Non-SUPER_ADMIN users can only include permissions they already have.",
            },
          },
        },
        CreatePermissionRequest: {
          type: "object",
          required: ["code", "name"],
          properties: {
            code: { type: "string", minLength: 3, example: "orders.create" },
            name: { type: "string", minLength: 2, example: "Create Orders" },
            description: {
              type: "string",
              example: "Allows creating new orders",
            },
          },
        },
        UpdatePermissionRequest: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2, example: "Create Orders" },
            description: {
              type: "string",
              example: "Allows creating new orders",
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  example: "INVALID_ACCESS_TOKEN",
                },
                message: {
                  type: "string",
                  example: "Access token is invalid",
                },
                details: {
                  type: "object",
                  nullable: true,
                  additionalProperties: true,
                },
              },
              required: ["code", "message"],
            },
          },
          required: ["success", "error"],
        },
        AuthTiming: {
          type: "object",
          properties: {
            accessTokenExpiresAt: {
              type: "string",
              format: "date-time",
            },
            refreshTokenExpiresAt: {
              type: "string",
              format: "date-time",
            },
          },
          required: ["accessTokenExpiresAt", "refreshTokenExpiresAt"],
        },
        AuthSessionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                user: {
                  $ref: "#/components/schemas/User",
                },
              },
              required: ["user"],
            },
          },
          required: ["success", "data"],
        },
        UserResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              $ref: "#/components/schemas/User",
            },
          },
          required: ["success", "data"],
        },
        MessageResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  example: "Operation completed successfully",
                },
              },
              required: ["message"],
            },
          },
          required: ["success", "data"],
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Ravi Shah" },
            email: {
              type: "string",
              example: "ravi@flowoid.com",
              nullable: true,
            },
            phone: { type: "string", example: "9876543210" },
            role: { type: "string", example: "SUPER_ADMIN" },
          },
        },
        ManagedUser: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Vatsal Shah" },
            email: {
              type: "string",
              format: "email",
              example: "vatsal@flowoid.com",
              nullable: true,
            },
            phone: { type: "string", example: "9876543210" },
            roleId: { type: "string", format: "uuid" },
            role: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "FREE_USERS" },
                description: {
                  type: "string",
                  nullable: true,
                  example: "Free plan users",
                },
              },
            },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            tenantUsers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  isActive: { type: "boolean", example: true },
                  tenant: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string", example: "Ayanshi Imitation" },
                      slug: { type: "string", example: "ayanshi-imitation" },
                      status: {
                        type: "string",
                        enum: ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"],
                      },
                    },
                  },
                  role: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string", example: "FREE_USERS" },
                    },
                  },
                },
              },
            },
          },
        },
        UserManagementResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/ManagedUser" },
          },
          required: ["success", "data"],
        },
        UserManagementListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/ManagedUser" },
            },
          },
          required: ["success", "data"],
        },
        Tenant: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Ayanshi Imitation" },
            slug: { type: "string", example: "ayanshi-imitation" },
            email: {
              type: "string",
              format: "email",
              example: "contact@ayanshi.com",
              nullable: true,
            },
            phone: {
              type: "string",
              example: "9876543210",
              nullable: true,
            },
            address: {
              type: "string",
              example: "Ahmedabad, Gujarat",
              nullable: true,
            },
            status: {
              type: "string",
              enum: ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"],
            },
            trialEndsAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            subscriptionEndsAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            logoUrl: {
              type: "string",
              format: "uri",
              nullable: true,
            },
            businessCategory: {
              type: "string",
              example: "Imitation Jewellery",
              nullable: true,
            },
            users: {
              type: "array",
              items: { $ref: "#/components/schemas/TenantUser" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        TenantUser: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            roleId: { type: "string", format: "uuid" },
            isActive: { type: "boolean", example: true },
            role: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "TENANT_OWNER" },
              },
            },
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Ravi Shah" },
                email: {
                  type: "string",
                  format: "email",
                  example: "ravi@flowoid.com",
                  nullable: true,
                },
                phone: { type: "string", example: "9876543210" },
              },
            },
          },
        },
        TenantResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Tenant" },
          },
          required: ["success", "data"],
        },
        TenantListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Tenant" },
            },
          },
          required: ["success", "data"],
        },
        MonitoringMetrics: {
          type: "object",
          properties: {
            timestamp: { type: "string", format: "date-time" },
            service: {
              type: "object",
              properties: {
                uptimeSeconds: { type: "integer", example: 3600 },
                pid: { type: "integer", example: 12345 },
                nodeVersion: { type: "string", example: "v24.14.1" },
                platform: { type: "string", example: "win32" },
                startedAt: { type: "string", format: "date-time" },
              },
            },
            system: {
              type: "object",
              properties: {
                hostname: { type: "string", example: "server-01" },
                cpuUsagePercent: { type: "number", example: 24.5 },
                cpuCount: { type: "integer", example: 8 },
                loadAverage: {
                  type: "array",
                  items: { type: "number" },
                  example: [0, 0, 0],
                },
                totalMemoryMb: { type: "number", example: 16384 },
                usedMemoryMb: { type: "number", example: 8192 },
                freeMemoryMb: { type: "number", example: 8192 },
                memoryUsagePercent: { type: "number", example: 50 },
              },
            },
            process: {
              type: "object",
              properties: {
                rssMb: { type: "number", example: 120.5 },
                heapTotalMb: { type: "number", example: 64 },
                heapUsedMb: { type: "number", example: 32.5 },
                externalMb: { type: "number", example: 4.2 },
              },
            },
            api: {
              type: "object",
              properties: {
                totalRequests: { type: "integer", example: 1500 },
                activeRequests: { type: "integer", example: 2 },
                averageResponseTimeMs: { type: "number", example: 48.25 },
                statusCodes: {
                  type: "object",
                  additionalProperties: { type: "integer" },
                  example: { "200": 1400, "400": 50, "500": 2 },
                },
                routes: {
                  type: "object",
                  additionalProperties: { type: "integer" },
                  example: { "GET /api/auth/me": 320 },
                },
              },
            },
            database: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["UP", "DOWN"] },
                latencyMs: { type: "integer", example: 12 },
              },
            },
          },
        },
        MonitoringMetricsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/MonitoringMetrics" },
          },
          required: ["success", "data"],
        },
        WorkerPaymentType: {
          type: "string",
          enum: ["EARNING_SETTLEMENT", "ADVANCE", "ADVANCE_RECOVERY"],
          description:
            "EARNING_SETTLEMENT settles completed work, ADVANCE records an early payout before work completion, and ADVANCE_RECOVERY records recovery of a previously given advance from worker earnings.",
        },
        AssignmentStatus: {
          type: "string",
          enum: ["ISSUED", "IN_PROGRESS", "PARTIALLY_RETURNED", "COMPLETED", "CLOSED"],
        },
        Worker: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Ramesh Patel" },
            phone: { type: "string", nullable: true, example: "9898989898" },
            alternatePhone: { type: "string", nullable: true, example: "9876501234" },
            address: { type: "string", nullable: true, example: "Gota, Ahmedabad" },
            city: { type: "string", nullable: true, example: "Ahmedabad" },
            idProofType: { type: "string", nullable: true, example: "Aadhar" },
            idProofNumber: { type: "string", nullable: true, example: "XXXX-XXXX-1234" },
            openingBalance: { type: "string", example: "2500.00" },
            openingBalanceType: {
              type: "string",
              enum: ["PAYABLE", "RECEIVABLE"],
              example: "PAYABLE",
            },
            openingBalanceDate: { type: "string", format: "date-time", nullable: true },
            notes: { type: "string", nullable: true, example: "Polishing specialist" },
            isActive: { type: "boolean", example: true },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        WorkerSummary: {
          type: "object",
          properties: {
            totalEarned: { type: "string", example: "4800.00" },
            totalPaid: { type: "string", example: "3000.00" },
            advanceGiven: { type: "string", example: "500.00" },
            outstandingBalance: { type: "string", example: "1800.00" },
            activeAssignments: { type: "integer", example: 2 },
            totalPiecesDelivered: { type: "integer", example: 265 },
          },
        },
        WorkerLedgerEntry: {
          type: "object",
          properties: {
            date: { type: "string", format: "date-time" },
            type: {
              type: "string",
              enum: [
                "OPENING_BALANCE",
                "GOODS_RETURN",
                "EARNING_SETTLEMENT",
                "ADVANCE",
                "ADVANCE_RECOVERY",
              ],
            },
            description: { type: "string", example: "Goods return for AY-NK-001 - 20 accepted piece(s)" },
            debit: { type: "string", example: "0.00" },
            credit: { type: "string", example: "360.00" },
            runningBalance: { type: "string", example: "860.00" },
          },
        },
        DesignStatus: {
          type: "string",
          enum: ["ACTIVE", "DISCONTINUED", "DRAFT"],
        },
        DesignCategory: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Necklace" },
            sortOrder: { type: "integer", example: 0 },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            designsCount: { type: "integer", example: 3 },
          },
        },
        Design: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid" },
            designCode: { type: "string", example: "AY-NK-001" },
            name: { type: "string", example: "Classic Stone Necklace" },
            description: {
              type: "string",
              nullable: true,
              example: "Stone necklace with floral pattern",
            },
            material: { type: "string", example: "Gold Plated" },
            finish: { type: "string", example: "Glossy" },
            diamondCount: { type: "integer", example: 12 },
            pieceRateRs: { type: "string", example: "18.00" },
            salePricePerDozen: { type: "string", example: "960.00" },
            imageUrl: {
              type: "string",
              format: "uri",
              nullable: true,
              example: "https://example.com/designs/ay-nk-001.png",
            },
            status: { $ref: "#/components/schemas/DesignStatus" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            notes: { type: "string", nullable: true, example: "Top-selling necklace" },
            createdById: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            category: {
              allOf: [{ $ref: "#/components/schemas/DesignCategory" }],
            },
            supplementaryNeeds: {
              type: "array",
              items: { $ref: "#/components/schemas/DesignSupplementaryNeed" },
            },
          },
        },
        DesignSupplementaryNeed: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            designId: { type: "string", format: "uuid" },
            materialTypeId: { type: "string", format: "uuid" },
            quantityPerPiece: { type: "string", example: "12.0000" },
            notes: { type: "string", nullable: true, example: "Use premium stones only" },
            materialType: { $ref: "#/components/schemas/SupplementaryMaterialType" },
          },
        },
        SupplementaryMaterialType: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            name: { type: "string", example: "White Round Stones 3mm" },
            unit: { type: "string", example: "pieces" },
            description: {
              type: "string",
              nullable: true,
              example: "Primary stone used for necklace work",
            },
            stockQuantity: { type: "string", example: "1500.0000" },
            isActive: { type: "boolean", example: true },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateDesignCategoryRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 2, example: "Necklace" },
            sortOrder: { type: "integer", default: 0, example: 0 },
          },
        },
        UpdateDesignCategoryRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            name: { type: "string", minLength: 2, example: "Bridal Necklace" },
            sortOrder: { type: "integer", example: 10 },
            isActive: { type: "boolean", example: true },
          },
        },
        CreateDesignRequest: {
          type: "object",
          required: [
            "categoryId",
            "designCode",
            "name",
            "diamondCount",
            "pieceRateRs",
            "salePricePerDozen",
          ],
          properties: {
            categoryId: { type: "string", format: "uuid" },
            designCode: { type: "string", example: "AY-NK-001" },
            name: { type: "string", minLength: 2, example: "Classic Stone Necklace" },
            description: { type: "string", example: "Necklace with premium stone layout" },
            material: { type: "string", example: "Gold Plated" },
            finish: { type: "string", example: "Glossy" },
            diamondCount: { type: "integer", minimum: 0, example: 12 },
            pieceRateRs: { type: "number", minimum: 0.01, example: 18 },
            salePricePerDozen: { type: "number", minimum: 0.01, example: 960 },
            imageUrl: {
              type: "string",
              format: "uri",
              example: "https://example.com/designs/ay-nk-001.png",
            },
            status: { $ref: "#/components/schemas/DesignStatus" },
            notes: { type: "string", example: "High demand design" },
          },
        },
        UpdateDesignRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            categoryId: { type: "string", format: "uuid" },
            designCode: { type: "string", example: "AY-NK-001" },
            name: { type: "string", minLength: 2, example: "Classic Stone Necklace" },
            description: { type: "string", example: "Updated description" },
            material: { type: "string", example: "Rhodium" },
            finish: { type: "string", example: "Matte" },
            diamondCount: { type: "integer", minimum: 0, example: 16 },
            pieceRateRs: { type: "number", minimum: 0.01, example: 22 },
            salePricePerDozen: { type: "number", minimum: 0.01, example: 1100 },
            imageUrl: {
              type: "string",
              format: "uri",
              example: "https://example.com/designs/ay-nk-001-v2.png",
            },
            status: { $ref: "#/components/schemas/DesignStatus" },
            notes: { type: "string", example: "Updated factory specification" },
          },
        },
        UpdateDesignStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { $ref: "#/components/schemas/DesignStatus" },
          },
        },
        CreateDesignSupplementaryNeedRequest: {
          type: "object",
          required: ["materialTypeId", "quantityPerPiece"],
          properties: {
            materialTypeId: { type: "string", format: "uuid" },
            quantityPerPiece: { type: "number", minimum: 0.0001, example: 12 },
            notes: { type: "string", example: "Default template quantity" },
          },
        },
        UpdateDesignSupplementaryNeedRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            quantityPerPiece: { type: "number", minimum: 0.0001, example: 14 },
            notes: { type: "string", example: "Use extra stones for premium variant" },
          },
        },
        CreateSupplementaryMaterialTypeRequest: {
          type: "object",
          required: ["name", "unit"],
          properties: {
            name: { type: "string", minLength: 2, example: "Golden Hook Fittings" },
            unit: { type: "string", example: "pieces" },
            description: { type: "string", example: "Standard earring hook fitting" },
            stockQuantity: { type: "number", minimum: 0, example: 2500 },
          },
        },
        UpdateSupplementaryMaterialTypeRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            name: { type: "string", minLength: 2, example: "Golden Hook Fittings" },
            unit: { type: "string", example: "pieces" },
            description: { type: "string", example: "Updated fitting description" },
            isActive: { type: "boolean", example: true },
          },
        },
        AdjustSupplementaryStockRequest: {
          type: "object",
          required: ["adjustment"],
          properties: {
            adjustment: { type: "number", example: -25 },
            notes: { type: "string", example: "Damaged stock removed after count" },
          },
        },
        DesignPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        SupplementaryPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        WorkerListItem: {
          allOf: [
            { $ref: "#/components/schemas/Worker" },
            {
              type: "object",
              properties: {
                activeAssignments: { type: "integer", example: 1 },
              },
            },
          ],
        },
        WorkerDetail: {
          allOf: [
            { $ref: "#/components/schemas/Worker" },
            {
              type: "object",
              properties: {
                summary: { $ref: "#/components/schemas/WorkerSummary" },
              },
              required: ["summary"],
            },
          ],
        },
        WorkerAssignment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            workerId: { type: "string", format: "uuid" },
            designId: { type: "string", format: "uuid" },
            rawMaterialTypeId: { type: "string", format: "uuid" },
            rawMaterialQty: { type: "string", example: "10.5000" },
            expectedPieces: { type: "integer", example: 120 },
            returnedPieces: { type: "integer", example: 48 },
            rejectedPieces: { type: "integer", example: 2 },
            pieceRateAtAssignment: { type: "string", example: "18.00" },
            totalEarned: { type: "string", example: "864.00" },
            status: { $ref: "#/components/schemas/AssignmentStatus" },
            issuedAt: { type: "string", format: "date-time" },
            expectedReturnDate: { type: "string", format: "date-time", nullable: true },
            completedAt: { type: "string", format: "date-time", nullable: true },
            notes: { type: "string", nullable: true, example: "Urgent bridal batch" },
            createdById: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            worker: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Ramesh Patel" },
                phone: { type: "string", nullable: true, example: "9898989898" },
              },
            },
            design: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                designCode: { type: "string", example: "AY-NK-001" },
                name: { type: "string", example: "Classic Stone Necklace" },
              },
            },
            rawMaterialType: { $ref: "#/components/schemas/RawMaterialType" },
            rawMaterialIssuance: {
              allOf: [{ $ref: "#/components/schemas/RawMaterialIssuance" }],
              nullable: true,
            },
            supplementaryIssuances: {
              type: "array",
              items: { $ref: "#/components/schemas/SupplementaryIssuance" },
            },
            goodsReturns: {
              type: "array",
              items: { $ref: "#/components/schemas/GoodsReturn" },
            },
          },
        },
        WorkerAssignmentSummary: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            expectedPieces: { type: "integer", example: 120 },
            returnedPieces: { type: "integer", example: 48 },
            rejectedPieces: { type: "integer", example: 2 },
            totalEarned: { type: "string", example: "864.00" },
            status: { $ref: "#/components/schemas/AssignmentStatus" },
            completedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        SupplementaryIssuance: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            assignmentId: { type: "string", format: "uuid" },
            materialTypeId: { type: "string", format: "uuid" },
            quantity: { type: "string", example: "240.0000" },
            notes: { type: "string", nullable: true, example: "Default template quantity" },
            createdById: { type: "string", format: "uuid" },
            issuedAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            materialType: { $ref: "#/components/schemas/SupplementaryMaterialType" },
          },
        },
        GoodsReturn: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            assignmentId: { type: "string", format: "uuid" },
            piecesReturned: { type: "integer", example: 25 },
            rejectedPieces: { type: "integer", example: 2 },
            acceptedPieces: { type: "integer", example: 23 },
            earningAmount: { type: "string", example: "414.00" },
            returnedAt: { type: "string", format: "date-time" },
            rejectionNotes: { type: "string", nullable: true, example: "2 pieces had broken stones" },
            notes: { type: "string", nullable: true, example: "First batch received" },
            createdById: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            createdBy: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Manager User" },
              },
            },
            assignment: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                status: { $ref: "#/components/schemas/AssignmentStatus" },
                expectedPieces: { type: "integer", example: 120, nullable: true },
                returnedPieces: { type: "integer", example: 48, nullable: true },
                rejectedPieces: { type: "integer", example: 2, nullable: true },
                totalEarned: { type: "string", example: "864.00", nullable: true },
                worker: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string", example: "Ramesh Patel" },
                    phone: { type: "string", nullable: true, example: "9898989898" },
                  },
                },
                design: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: { type: "string", format: "uuid" },
                    designCode: { type: "string", example: "AY-NK-001" },
                    name: { type: "string", example: "Classic Stone Necklace" },
                  },
                },
              },
            },
          },
        },
        WorkerPayment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            workerId: { type: "string", format: "uuid" },
            amount: { type: "string", example: "1500.00" },
            paymentType: { $ref: "#/components/schemas/WorkerPaymentType" },
            paymentMode: { type: "string", example: "CASH" },
            paidAt: { type: "string", format: "date-time" },
            notes: { type: "string", nullable: true, example: "Weekly settlement" },
            recordedById: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            worker: {
              allOf: [{ $ref: "#/components/schemas/Worker" }],
              nullable: true,
            },
            recordedBy: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Manager User" },
              },
            },
          },
        },
        WorkerPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        AssignmentPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        GoodsReturnPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        DesignCategoryResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/DesignCategory" },
          },
          required: ["success", "data"],
        },
        DesignCategoryListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/DesignCategory" },
                },
                pagination: { $ref: "#/components/schemas/DesignPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        DesignResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Design" },
          },
          required: ["success", "data"],
        },
        DesignListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Design" },
                },
                pagination: { $ref: "#/components/schemas/DesignPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        DesignSupplementaryNeedResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/DesignSupplementaryNeed" },
          },
          required: ["success", "data"],
        },
        DesignSupplementaryNeedListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/DesignSupplementaryNeed" },
            },
          },
          required: ["success", "data"],
        },
        SupplementaryMaterialTypeResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/SupplementaryMaterialType" },
          },
          required: ["success", "data"],
        },
        SupplementaryMaterialTypeListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/SupplementaryMaterialType" },
                },
                pagination: { $ref: "#/components/schemas/SupplementaryPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        CreateWorkerRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 2, example: "Ramesh Patel" },
            phone: { type: "string", example: "9898989898" },
            alternatePhone: { type: "string", example: "9876501234" },
            address: { type: "string", example: "Gota, Ahmedabad" },
            city: { type: "string", example: "Ahmedabad" },
            idProofType: { type: "string", example: "Aadhar" },
            idProofNumber: { type: "string", example: "XXXX-XXXX-1234" },
            openingBalance: { type: "number", minimum: 0, default: 0, example: 2500 },
            openingBalanceType: {
              type: "string",
              enum: ["PAYABLE", "RECEIVABLE"],
              default: "PAYABLE",
            },
            openingBalanceDate: { type: "string", format: "date-time" },
            notes: { type: "string", example: "Experienced in necklace finishing" },
          },
        },
        UpdateWorkerRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            name: { type: "string", minLength: 2, example: "Ramesh Patel" },
            phone: { type: "string", example: "9898989898" },
            alternatePhone: { type: "string", example: "9876501234" },
            address: { type: "string", example: "Naranpura, Ahmedabad" },
            city: { type: "string", example: "Ahmedabad" },
            idProofType: { type: "string", example: "PAN" },
            idProofNumber: { type: "string", example: "ABCDE1234F" },
            openingBalance: { type: "number", minimum: 0, example: 1500 },
            openingBalanceType: { type: "string", enum: ["PAYABLE", "RECEIVABLE"] },
            openingBalanceDate: { type: "string", format: "date-time" },
            notes: { type: "string", example: "Updated onboarding note" },
          },
        },
        CreateWorkerPaymentRequest: {
          type: "object",
          required: ["workerId", "amount", "paymentType"],
          properties: {
            workerId: { type: "string", format: "uuid" },
            amount: { type: "number", minimum: 0.01, example: 1500 },
            paymentType: { $ref: "#/components/schemas/WorkerPaymentType" },
            paymentMode: { type: "string", default: "CASH", example: "CASH" },
            paidAt: { type: "string", format: "date-time" },
            notes: { type: "string", example: "Weekly settlement" },
          },
        },
        CreateAssignmentRequest: {
          type: "object",
          required: [
            "workerId",
            "designId",
            "rawMaterialTypeId",
            "rawMaterialQty",
            "expectedPieces",
          ],
          properties: {
            workerId: { type: "string", format: "uuid" },
            designId: { type: "string", format: "uuid" },
            rawMaterialTypeId: { type: "string", format: "uuid" },
            rawMaterialQty: { type: "number", minimum: 0.0001, example: 10.5 },
            expectedPieces: { type: "integer", minimum: 1, example: 120 },
            expectedReturnDate: { type: "string", format: "date-time" },
            notes: { type: "string", example: "Urgent bridal batch" },
          },
          description:
            "Supplementary issuances are calculated automatically from the design's supplementary needs and do not need to be provided in this request.",
        },
        UpdateAssignmentRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            expectedReturnDate: { type: "string", format: "date-time" },
            notes: { type: "string", example: "Updated expected completion date after discussion with worker" },
          },
        },
        UpdateAssignmentStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["IN_PROGRESS"],
              example: "IN_PROGRESS",
            },
          },
        },
        CloseAssignmentRequest: {
          type: "object",
          required: ["notes"],
          properties: {
            notes: { type: "string", minLength: 1, example: "Worker unavailable due to medical emergency" },
          },
        },
        CreateGoodsReturnRequest: {
          type: "object",
          required: ["piecesReturned"],
          properties: {
            piecesReturned: { type: "integer", minimum: 1, example: 25 },
            rejectedPieces: { type: "integer", minimum: 0, default: 0, example: 2 },
            rejectionNotes: { type: "string", example: "2 pieces had broken stones" },
            notes: { type: "string", example: "First batch received" },
            returnedAt: { type: "string", format: "date-time" },
          },
        },
        WorkerResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Worker" },
          },
          required: ["success", "data"],
        },
        WorkerDetailResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/WorkerDetail" },
          },
          required: ["success", "data"],
        },
        WorkerListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/WorkerListItem" },
                },
                pagination: { $ref: "#/components/schemas/WorkerPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        WorkerAssignmentListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/WorkerAssignment" },
                },
                pagination: { $ref: "#/components/schemas/AssignmentPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        WorkerAssignmentResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/WorkerAssignment" },
          },
          required: ["success", "data"],
        },
        WorkerPaymentResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/WorkerPayment" },
          },
          required: ["success", "data"],
        },
        WorkerPaymentListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/WorkerPayment" },
                },
                pagination: { $ref: "#/components/schemas/WorkerPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        CreateWorkerPaymentResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                payment: { $ref: "#/components/schemas/WorkerPayment" },
                summary: { $ref: "#/components/schemas/WorkerSummary" },
              },
              required: ["payment", "summary"],
            },
          },
          required: ["success", "data"],
        },
        WorkerLedgerResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/WorkerLedgerEntry" },
            },
          },
          required: ["success", "data"],
        },
        AssignmentGoodsReturnListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/GoodsReturn" },
            },
          },
          required: ["success", "data"],
        },
        GoodsReturnResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/GoodsReturn" },
          },
          required: ["success", "data"],
        },
        GoodsReturnListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/GoodsReturn" },
                },
                pagination: { $ref: "#/components/schemas/GoodsReturnPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        GoodsReturnRecordResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                goodsReturn: { $ref: "#/components/schemas/GoodsReturn" },
                assignment: { $ref: "#/components/schemas/WorkerAssignmentSummary" },
              },
              required: ["goodsReturn", "assignment"],
            },
          },
          required: ["success", "data"],
        },
        Party: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["DEALER", "SUPPLIER"] },
            name: { type: "string", example: "Shree Balaji Traders" },
            code: { type: "string", example: "SBT001", nullable: true },
            contactPerson: { type: "string", example: "Rohit Sharma", nullable: true },
            phone: { type: "string", example: "9876543210", nullable: true },
            alternatePhone: { type: "string", example: "9123456780", nullable: true },
            email: { type: "string", format: "email", example: "balaji@example.com", nullable: true },
            gstin: { type: "string", example: "24ABCDE1234F1Z5", nullable: true },
            pan: { type: "string", example: "ABCDE1234F", nullable: true },
            addressLine1: { type: "string", example: "Ring Road", nullable: true },
            addressLine2: { type: "string", example: "Textile Market", nullable: true },
            city: { type: "string", example: "Surat", nullable: true },
            state: { type: "string", example: "Gujarat", nullable: true },
            country: { type: "string", example: "India", nullable: true },
            postalCode: { type: "string", example: "395002", nullable: true },
            creditPeriodDays: { type: "integer", example: 30, nullable: true },
            creditLimit: { type: "string", example: "150000", nullable: true },
            openingBalance: { type: "string", example: "25000" },
            openingBalanceType: { type: "string", enum: ["RECEIVABLE", "PAYABLE"] },
            openingBalanceDate: { type: "string", format: "date-time", nullable: true },
            notes: { type: "string", example: "Preferred dealer", nullable: true },
            isActive: { type: "boolean", example: true },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreatePartyRequest: {
          type: "object",
          required: ["type", "name"],
          properties: {
            type: { type: "string", enum: ["DEALER", "SUPPLIER"] },
            name: { type: "string", minLength: 2, example: "Shree Balaji Traders" },
            code: { type: "string", example: "SBT001" },
            contactPerson: { type: "string", example: "Rohit Sharma" },
            phone: { type: "string", example: "9876543210" },
            alternatePhone: { type: "string", example: "9123456780" },
            email: { type: "string", format: "email", example: "balaji@example.com" },
            gstin: { type: "string", example: "24ABCDE1234F1Z5" },
            pan: { type: "string", example: "ABCDE1234F" },
            addressLine1: { type: "string", example: "Ring Road" },
            addressLine2: { type: "string", example: "Textile Market" },
            city: { type: "string", example: "Surat" },
            state: { type: "string", example: "Gujarat" },
            country: { type: "string", example: "India" },
            postalCode: { type: "string", example: "395002" },
            creditPeriodDays: { type: "integer", minimum: 0, example: 30 },
            creditLimit: { type: "number", minimum: 0, example: 150000 },
            openingBalance: { type: "number", minimum: 0, example: 25000 },
            openingBalanceType: { type: "string", enum: ["RECEIVABLE", "PAYABLE"], default: "RECEIVABLE" },
            openingBalanceDate: { type: "string", format: "date-time", example: "2026-05-02T00:00:00.000Z" },
            notes: { type: "string", example: "Preferred dealer" },
            isActive: { type: "boolean", example: true },
          },
        },
        UpdatePartyRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            type: { type: "string", enum: ["DEALER", "SUPPLIER"] },
            name: { type: "string", minLength: 2, example: "Shree Balaji Traders" },
            code: { type: "string", example: "SBT001" },
            contactPerson: { type: "string", example: "Amit Shah" },
            phone: { type: "string", example: "9988776655" },
            alternatePhone: { type: "string", example: "9123456780" },
            email: { type: "string", format: "email", example: "balaji@example.com" },
            gstin: { type: "string", example: "24ABCDE1234F1Z5" },
            pan: { type: "string", example: "ABCDE1234F" },
            addressLine1: { type: "string", example: "Ring Road" },
            addressLine2: { type: "string", example: "Textile Market" },
            city: { type: "string", example: "Surat" },
            state: { type: "string", example: "Gujarat" },
            country: { type: "string", example: "India" },
            postalCode: { type: "string", example: "395002" },
            creditPeriodDays: { type: "integer", minimum: 0, example: 45 },
            creditLimit: { type: "number", minimum: 0, example: 200000 },
            openingBalance: { type: "number", minimum: 0, example: 25000 },
            openingBalanceType: { type: "string", enum: ["RECEIVABLE", "PAYABLE"] },
            openingBalanceDate: { type: "string", format: "date-time", example: "2026-05-02T00:00:00.000Z" },
            notes: { type: "string", example: "Updated credit limit" },
            isActive: { type: "boolean", example: true },
          },
        },
        UpdatePartyStatusRequest: {
          type: "object",
          required: ["isActive"],
          properties: {
            isActive: { type: "boolean", example: false },
          },
        },
        CreateOpeningBalanceRequest: {
          type: "object",
          required: ["openingBalance", "openingBalanceType", "openingBalanceDate"],
          properties: {
            openingBalance: { type: "number", minimum: 0.01, example: 25000 },
            openingBalanceType: { type: "string", enum: ["RECEIVABLE", "PAYABLE"] },
            openingBalanceDate: { type: "string", format: "date-time", example: "2026-05-02T00:00:00.000Z" },
            notes: { type: "string", example: "Initial opening balance" },
          },
        },
        UpdateOpeningBalanceRequest: {
          type: "object",
          description: "Provide at least one field to update. Setting openingBalance to 0 removes the opening entry.",
          properties: {
            openingBalance: { type: "number", minimum: 0, example: 18000 },
            openingBalanceType: { type: "string", enum: ["RECEIVABLE", "PAYABLE"] },
            openingBalanceDate: { type: "string", format: "date-time", example: "2026-05-02T00:00:00.000Z" },
            notes: { type: "string", example: "Adjusted after reconciliation" },
          },
        },
        PartyPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        PartyResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Party" },
          },
          required: ["success", "data"],
        },
        PartyListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Party" },
                },
                pagination: { $ref: "#/components/schemas/PartyPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        PartyDropdownItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["DEALER", "SUPPLIER"] },
            name: { type: "string", example: "Shree Balaji Traders" },
            code: { type: "string", example: "SBT001", nullable: true },
            phone: { type: "string", example: "9876543210", nullable: true },
            gstin: { type: "string", example: "24ABCDE1234F1Z5", nullable: true },
            isActive: { type: "boolean", example: true },
          },
        },
        PartyDropdownResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PartyDropdownItem" },
                },
              },
              required: ["items"],
            },
          },
          required: ["success", "data"],
        },
        PartyDuplicateCheckResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                exists: { type: "boolean", example: true },
                duplicateBy: {
                  type: "array",
                  items: { type: "string", enum: ["name", "phone", "code", "gstin"] },
                  example: ["name", "phone"],
                },
                party: {
                  type: "object",
                  nullable: true,
                  properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string", example: "Shree Balaji Traders" },
                    code: { type: "string", example: "SBT001", nullable: true },
                    gstin: { type: "string", example: "24ABCDE1234F1Z5", nullable: true },
                    phone: { type: "string", example: "9876543210", nullable: true },
                  },
                },
                checkedFields: {
                  type: "object",
                  properties: {
                    name: { type: "string", nullable: true, example: "Shree Balaji Traders" },
                    phone: { type: "string", nullable: true, example: "9876543210" },
                    code: { type: "string", nullable: true, example: "SBT001" },
                    gstin: { type: "string", nullable: true, example: "24ABCDE1234F1Z5" },
                  },
                },
              },
              required: ["exists", "duplicateBy", "party", "checkedFields"],
            },
          },
          required: ["success", "data"],
        },
        PartyLedgerEntry: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            entryDate: { type: "string", format: "date-time" },
            entryType: {
              type: "string",
              enum: [
                "OPENING_BALANCE",
                "SALE",
                "PURCHASE",
                "PAYMENT_RECEIVED",
                "PAYMENT_MADE",
                "CREDIT_NOTE",
                "DEBIT_NOTE",
                "ADJUSTMENT",
                "JOURNAL",
              ],
            },
            voucherType: { type: "string", nullable: true, example: "SALE_INVOICE" },
            voucherId: { type: "string", nullable: true, example: "voucher-uuid" },
            referenceNo: { type: "string", nullable: true, example: "INV-001" },
            description: { type: "string", nullable: true, example: "Opening balance" },
            debitAmount: { type: "string", example: "25000" },
            creditAmount: { type: "string", example: "0" },
            runningBalance: { type: "string", nullable: true, example: "25000" },
            isOpeningEntry: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        OpeningBalanceResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                party: { $ref: "#/components/schemas/Party" },
                hasOpeningBalance: { type: "boolean", example: true },
                openingBalance: {
                  type: "object",
                  properties: {
                    amount: { type: "string", example: "25000" },
                    type: { type: "string", enum: ["RECEIVABLE", "PAYABLE"] },
                    date: { type: "string", format: "date-time", nullable: true },
                    entry: {
                      anyOf: [
                        { $ref: "#/components/schemas/PartyLedgerEntry" },
                        { type: "null" },
                      ],
                    },
                  },
                  required: ["amount", "type", "date", "entry"],
                },
              },
              required: ["party", "hasOpeningBalance", "openingBalance"],
            },
          },
          required: ["success", "data"],
        },
        PartyStatementSummary: {
          type: "object",
          properties: {
            balanceBeforePeriod: { type: "string", example: "25000" },
            totalDebit: { type: "string", example: "10000" },
            totalCredit: { type: "string", example: "5000" },
            closingBalance: { type: "string", example: "30000" },
            balanceNature: { type: "string", enum: ["RECEIVABLE", "PAYABLE", "SETTLED"] },
          },
        },
        PartyStatementResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                party: { $ref: "#/components/schemas/Party" },
                filters: {
                  type: "object",
                  properties: {
                    fromDate: { type: "string", format: "date-time", nullable: true },
                    toDate: { type: "string", format: "date-time", nullable: true },
                    includeOpeningEntry: { type: "boolean", example: true },
                  },
                },
                summary: { $ref: "#/components/schemas/PartyStatementSummary" },
                entries: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PartyLedgerEntry" },
                },
                pagination: { $ref: "#/components/schemas/PartyPagination" },
              },
              required: ["party", "filters", "summary", "entries", "pagination"],
            },
          },
        },
        RawMaterialUnit: {
          type: "string",
          enum: ["KG", "GRAM", "PIECE", "METER", "DOZEN"],
        },
        RawMaterialPurchaseStatus: {
          type: "string",
          enum: ["PENDING", "RECEIVED", "CANCELLED"],
        },
        RawMaterialType: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Gold Plated Base" },
            unit: { $ref: "#/components/schemas/RawMaterialUnit" },
            description: { type: "string", nullable: true, example: "Base layer" },
            isActive: { type: "boolean", example: true },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            currentStock: { type: "string", nullable: true, example: "25.5" },
          },
        },
        RawMaterialPurchase: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            materialTypeId: { type: "string", format: "uuid" },
            supplierId: { type: "string", format: "uuid" },
            quantity: { type: "string", example: "100.25" },
            costPerUnit: { type: "string", example: "12.50" },
            totalCost: { type: "string", example: "1253.12" },
            status: { $ref: "#/components/schemas/RawMaterialPurchaseStatus" },
            purchaseDate: { type: "string", format: "date-time" },
            invoiceNumber: { type: "string", nullable: true, example: "INV-1024" },
            notes: { type: "string", nullable: true },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdById: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            materialType: { $ref: "#/components/schemas/RawMaterialType" },
            supplier: { $ref: "#/components/schemas/Party" },
          },
        },
        RawMaterialIssuance: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            materialTypeId: { type: "string", format: "uuid" },
            assignmentId: { type: "string", format: "uuid" },
            quantity: { type: "string", example: "12.5" },
            issuedAt: { type: "string", format: "date-time" },
            notes: { type: "string", nullable: true },
            createdById: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            materialType: { $ref: "#/components/schemas/RawMaterialType" },
          },
        },
        RawMaterialStock: {
          type: "object",
          properties: {
            materialTypeId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Gold Plated Base" },
            unit: { $ref: "#/components/schemas/RawMaterialUnit" },
            totalPurchased: { type: "string", example: "120.0" },
            totalIssued: { type: "string", example: "25.0" },
            currentStock: { type: "string", example: "95.0" },
            isLow: { type: "boolean", example: false },
          },
        },
        RawMaterialPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        RawMaterialTypeResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/RawMaterialType" },
          },
          required: ["success", "data"],
        },
        RawMaterialTypeListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/RawMaterialType" },
                },
                pagination: { $ref: "#/components/schemas/RawMaterialPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        RawMaterialPurchaseResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/RawMaterialPurchase" },
          },
          required: ["success", "data"],
        },
        RawMaterialPurchaseListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/RawMaterialPurchase" },
                },
                pagination: { $ref: "#/components/schemas/RawMaterialPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        RawMaterialIssuanceResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/RawMaterialIssuance" },
          },
          required: ["success", "data"],
        },
        RawMaterialIssuanceListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/RawMaterialIssuance" },
                },
                pagination: { $ref: "#/components/schemas/RawMaterialPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        RawMaterialStockResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/RawMaterialStock" },
            },
          },
          required: ["success", "data"],
        },
        CreateRawMaterialTypeRequest: {
          type: "object",
          required: ["name", "unit"],
          properties: {
            name: { type: "string", minLength: 2, example: "Gold Plated Base" },
            unit: { $ref: "#/components/schemas/RawMaterialUnit" },
            description: { type: "string", example: "Base layer" },
          },
        },
        UpdateRawMaterialTypeRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            name: { type: "string", minLength: 2, example: "Rhodium Base" },
            unit: { $ref: "#/components/schemas/RawMaterialUnit" },
            description: { type: "string", example: "Updated description" },
            isActive: { type: "boolean", example: true },
          },
        },
        CreateRawMaterialPurchaseRequest: {
          type: "object",
          required: [
            "materialTypeId",
            "supplierId",
            "quantity",
            "costPerUnit",
            "purchaseDate",
          ],
          properties: {
            materialTypeId: { type: "string", format: "uuid" },
            supplierId: { type: "string", format: "uuid" },
            quantity: { type: "number", minimum: 0.0001, example: 100.25 },
            costPerUnit: { type: "number", minimum: 0.01, example: 12.5 },
            purchaseDate: { type: "string", format: "date-time" },
            status: { $ref: "#/components/schemas/RawMaterialPurchaseStatus" },
            invoiceNumber: { type: "string", example: "INV-1024" },
            notes: { type: "string" },
          },
        },
        UpdateRawMaterialPurchaseRequest: {
          type: "object",
          description: "Provide at least one field to update",
          properties: {
            quantity: { type: "number", minimum: 0.0001, example: 120.5 },
            costPerUnit: { type: "number", minimum: 0.01, example: 13.5 },
            purchaseDate: { type: "string", format: "date-time" },
            status: { $ref: "#/components/schemas/RawMaterialPurchaseStatus" },
            invoiceNumber: { type: "string", example: "INV-1024" },
            notes: { type: "string" },
          },
        },
        CreateRawMaterialIssuanceRequest: {
          type: "object",
          required: ["materialTypeId", "quantity"],
          properties: {
            materialTypeId: { type: "string", format: "uuid" },
            quantity: { type: "number", minimum: 0.0001, example: 10.5 },
            issuedAt: { type: "string", format: "date-time" },
            issuedTo: { type: "string", example: "Worker A" },
            notes: { type: "string" },
          },
        },
        Payment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            paymentType: {
              type: "string",
              enum: [
                "DEALER_PAYMENT",
                "SUPPLIER_PAYMENT",
                "WORKER_PAYMENT",
                "DEALER_ADVANCE",
                "WORKER_ADVANCE",
              ],
            },
            paymentMode: {
              type: "string",
              enum: ["CASH", "BANK_TRANSFER", "UPI"],
            },
            amount: { type: "string", example: "4800.00" },
            isAdvance: { type: "boolean", example: false },
            paidAt: { type: "string", format: "date-time" },
          },
        },
        Assignment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            workerId: { type: "string", format: "uuid" },
            designId: { type: "string", format: "uuid" },
            rawMaterialQty: { type: "number", example: 10 },
            expectedPieces: { type: "integer", example: 120 },
            returnedPieces: { type: "integer", example: 48 },
            rejectedPieces: { type: "integer", example: 2 },
            pieceRateAtAssignment: { type: "string", example: "18.00" },
            status: { $ref: "#/components/schemas/AssignmentStatus" },
            issuedAt: { type: "string", format: "date-time" },
          },
        },
        InventoryStock: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            designId: { type: "string", format: "uuid" },
            unpackagedPieces: { type: "integer", example: 84 },
            packagedDozens: { type: "integer", example: 15 },
            lowStockAlertAt: { type: "integer", example: 5 },
            isLow: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            design: { $ref: "#/components/schemas/InventoryDesign" },
          },
        },
        InventoryDesign: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid" },
            designCode: { type: "string", example: "AY-NK-001" },
            name: { type: "string", example: "Classic Necklace" },
            status: { type: "string", enum: ["ACTIVE", "DISCONTINUED", "DRAFT"] },
            salePricePerDozen: { type: "string", example: "1200.00" },
            category: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Necklace" },
              },
            },
          },
        },
        InventoryPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        InventoryAdjustmentType: {
          type: "string",
          enum: ["UNPACKAGED", "PACKAGED"],
        },
        PackagingBatch: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            inventoryStockId: { type: "string", format: "uuid" },
            dozensPackaged: { type: "integer", example: 3 },
            piecesUsed: { type: "integer", example: 36 },
            packedById: { type: "string", format: "uuid" },
            packedAt: { type: "string", format: "date-time" },
            notes: { type: "string", nullable: true, example: "Packed for showroom stock" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            design: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                designCode: { type: "string", example: "AY-NK-001" },
                name: { type: "string", example: "Classic Necklace" },
                category: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string", example: "Necklace" },
                  },
                },
              },
            },
            packedBy: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Ravi Shah" },
              },
            },
          },
        },
        InventoryAdjustment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            inventoryStockId: { type: "string", format: "uuid" },
            type: { $ref: "#/components/schemas/InventoryAdjustmentType" },
            adjustment: { type: "integer", example: -2 },
            notes: { type: "string", example: "Damaged goods written off" },
            adjustedById: { type: "string", format: "uuid" },
            adjustedAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        InventoryLowStockAlert: {
          allOf: [
            { $ref: "#/components/schemas/InventoryStock" },
            {
              type: "object",
              properties: {
                deficitDozens: { type: "integer", example: 3 },
              },
            },
          ],
        },
        InventoryStockResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/InventoryStock" },
          },
          required: ["success", "data"],
        },
        InventoryStockDetailResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              allOf: [
                { $ref: "#/components/schemas/InventoryStock" },
                {
                  type: "object",
                  properties: {
                    packagingBatches: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PackagingBatch" },
                    },
                  },
                },
              ],
            },
          },
          required: ["success", "data"],
        },
        InventoryStockListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/InventoryStock" },
                },
                pagination: { $ref: "#/components/schemas/InventoryPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        InventoryLowStockAlertListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/InventoryLowStockAlert" },
            },
          },
          required: ["success", "data"],
        },
        PackagingBatchResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/PackagingBatch" },
          },
          required: ["success", "data"],
        },
        PackagingBatchListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PackagingBatch" },
                },
                pagination: { $ref: "#/components/schemas/InventoryPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        PackagingBatchCreateResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                batch: { $ref: "#/components/schemas/PackagingBatch" },
                stock: { $ref: "#/components/schemas/InventoryStock" },
              },
              required: ["batch", "stock"],
            },
          },
          required: ["success", "data"],
        },
        InventoryAdjustmentCreateResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                adjustment: { $ref: "#/components/schemas/InventoryAdjustment" },
                stock: { $ref: "#/components/schemas/InventoryStock" },
              },
              required: ["adjustment", "stock"],
            },
          },
          required: ["success", "data"],
        },
        CreatePackagingBatchRequest: {
          type: "object",
          additionalProperties: false,
          required: ["designId", "dozensPackaged"],
          properties: {
            designId: { type: "string", format: "uuid" },
            dozensPackaged: { type: "integer", minimum: 1, example: 3 },
            notes: { type: "string", example: "Packed for showroom stock" },
          },
        },
        UpdateInventoryLowStockAlertRequest: {
          type: "object",
          additionalProperties: false,
          required: ["lowStockAlertAt"],
          properties: {
            lowStockAlertAt: { type: "integer", minimum: 0, example: 5 },
          },
        },
        CreateInventoryAdjustmentRequest: {
          type: "object",
          additionalProperties: false,
          required: ["type", "adjustment", "notes"],
          properties: {
            type: { $ref: "#/components/schemas/InventoryAdjustmentType" },
            adjustment: { type: "integer", example: -2 },
            notes: { type: "string", example: "Damaged goods written off" },
          },
        },
        OrderStatus: {
          type: "string",
          enum: [
            "DRAFT",
            "CONFIRMED",
            "PACKED",
            "PARTIALLY_DISPATCHED",
            "DISPATCHED",
            "CANCELLED",
          ],
        },
        OrderDealer: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["DEALER", "SUPPLIER"] },
            name: { type: "string", example: "R K Jewellers" },
            code: { type: "string", nullable: true, example: "RKJ" },
            contactPerson: { type: "string", nullable: true, example: "Ramesh Shah" },
            phone: { type: "string", nullable: true, example: "9876543210" },
            email: { type: "string", nullable: true, example: "dealer@example.com" },
            addressLine1: { type: "string", nullable: true },
            addressLine2: { type: "string", nullable: true },
            city: { type: "string", nullable: true, example: "Surat" },
            state: { type: "string", nullable: true, example: "Gujarat" },
            country: { type: "string", nullable: true, example: "India" },
            postalCode: { type: "string", nullable: true },
            creditPeriodDays: { type: "integer", nullable: true, example: 30 },
          },
        },
        OrderDesign: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            designCode: { type: "string", example: "AY-NK-001" },
            name: { type: "string", example: "Classic Necklace" },
            category: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Necklace" },
              },
            },
          },
        },
        OrderItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            orderId: { type: "string", format: "uuid" },
            designId: { type: "string", format: "uuid" },
            quantityDozens: { type: "integer", example: 10 },
            dispatchedDozens: { type: "integer", example: 4 },
            remainingDozens: { type: "integer", example: 6 },
            pricePerDozen: { type: "string", example: "1200.00" },
            lineTotal: { type: "string", example: "12000.00" },
            notes: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            design: { $ref: "#/components/schemas/OrderDesign" },
          },
        },
        OrderDispatchItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            dispatchId: { type: "string", format: "uuid" },
            orderItemId: { type: "string", format: "uuid" },
            inventoryStockId: { type: "string", format: "uuid" },
            dozensDispatched: { type: "integer", example: 4 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            orderItem: { $ref: "#/components/schemas/OrderItem" },
          },
        },
        OrderDispatch: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            orderId: { type: "string", format: "uuid" },
            transportMode: { type: "string", example: "DTDC" },
            trackingRef: { type: "string", nullable: true, example: "D123456789" },
            dispatchedAt: { type: "string", format: "date-time" },
            dispatchedById: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/OrderDispatchItem" },
            },
          },
        },
        Order: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            dealerId: { type: "string", format: "uuid" },
            orderNumber: { type: "string", example: "ORD-2026-0001" },
            status: { $ref: "#/components/schemas/OrderStatus" },
            orderDate: { type: "string", format: "date-time" },
            isCreditOrder: { type: "boolean", example: true },
            dueDate: { type: "string", format: "date-time", nullable: true },
            subtotalAmount: { type: "string", example: "12000.00" },
            discountAmount: { type: "string", example: "500.00" },
            totalAmount: { type: "string", example: "11500.00" },
            notes: { type: "string", nullable: true },
            confirmedAt: { type: "string", format: "date-time", nullable: true },
            packedAt: { type: "string", format: "date-time", nullable: true },
            dispatchedAt: { type: "string", format: "date-time", nullable: true },
            cancelledAt: { type: "string", format: "date-time", nullable: true },
            cancelReason: { type: "string", nullable: true },
            createdById: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            totalDozens: { type: "integer", example: 10 },
            dispatchedDozens: { type: "integer", example: 4 },
            remainingDozens: { type: "integer", example: 6 },
            isOverdue: { type: "boolean", example: false },
            outstandingAmount: { type: "string", example: "11500.00" },
            dealer: { $ref: "#/components/schemas/OrderDealer" },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/OrderItem" },
            },
            dispatches: {
              type: "array",
              items: { $ref: "#/components/schemas/OrderDispatch" },
            },
          },
        },
        OrderPagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            totalItems: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 1 },
            hasNextPage: { type: "boolean", example: false },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        OrderResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Order" },
          },
          required: ["success", "data"],
        },
        OrderListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Order" },
                },
                pagination: { $ref: "#/components/schemas/OrderPagination" },
              },
              required: ["items", "pagination"],
            },
          },
          required: ["success", "data"],
        },
        OverdueOrderListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: {
                allOf: [
                  { $ref: "#/components/schemas/Order" },
                  {
                    type: "object",
                    properties: {
                      daysOverdue: { type: "integer", example: 12 },
                    },
                  },
                ],
              },
            },
          },
          required: ["success", "data"],
        },
        OrderDispatchSummaryResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                order: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    orderNumber: { type: "string", example: "ORD-2026-0001" },
                    orderDate: { type: "string", format: "date-time" },
                    status: { $ref: "#/components/schemas/OrderStatus" },
                    totalAmount: { type: "string", example: "11500.00" },
                    dispatchedAt: { type: "string", format: "date-time", nullable: true },
                  },
                },
                dealer: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "R K Jewellers" },
                    addressLine1: { type: "string", nullable: true },
                    addressLine2: { type: "string", nullable: true },
                    phone: { type: "string", nullable: true, example: "9876543210" },
                    city: { type: "string", nullable: true, example: "Surat" },
                  },
                },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      dispatchId: { type: "string", format: "uuid" },
                      dispatchedAt: { type: "string", format: "date-time" },
                      transportMode: { type: "string", example: "DTDC" },
                      trackingRef: { type: "string", nullable: true, example: "D123456789" },
                      designCode: { type: "string", example: "AY-NK-001" },
                      designName: { type: "string", example: "Classic Necklace" },
                      dispatchedDozens: { type: "integer", example: 4 },
                    },
                  },
                },
                totalDozensDispatched: { type: "integer", example: 4 },
                totalAmount: { type: "string", example: "11500.00" },
                dispatches: {
                  type: "array",
                  items: { $ref: "#/components/schemas/OrderDispatch" },
                },
              },
            },
          },
          required: ["success", "data"],
        },
        CreateOrderItemRequest: {
          type: "object",
          additionalProperties: false,
          required: ["designId", "quantityDozens"],
          properties: {
            designId: { type: "string", format: "uuid" },
            quantityDozens: { type: "integer", minimum: 1, example: 10 },
            pricePerDozen: { type: "number", exclusiveMinimum: 0, example: 1200 },
            notes: { type: "string", example: "Priority design" },
          },
        },
        CreateOrderRequest: {
          type: "object",
          additionalProperties: false,
          required: ["dealerId", "isCreditOrder", "items"],
          properties: {
            dealerId: { type: "string", format: "uuid" },
            isCreditOrder: { type: "boolean", example: true },
            items: {
              type: "array",
              minItems: 1,
              items: { $ref: "#/components/schemas/CreateOrderItemRequest" },
            },
            discountAmount: { type: "number", minimum: 0, example: 500 },
            notes: { type: "string", example: "Dealer requested early dispatch" },
          },
        },
        UpdateOrderRequest: {
          type: "object",
          additionalProperties: false,
          properties: {
            discountAmount: { type: "number", minimum: 0, example: 500 },
            notes: { type: "string", example: "Updated order note" },
            isCreditOrder: { type: "boolean", example: false },
          },
        },
        AddOrderItemRequest: {
          allOf: [{ $ref: "#/components/schemas/CreateOrderItemRequest" }],
        },
        UpdateOrderItemRequest: {
          type: "object",
          additionalProperties: false,
          properties: {
            quantityDozens: { type: "integer", minimum: 1, example: 12 },
            pricePerDozen: { type: "number", exclusiveMinimum: 0, example: 1250 },
            notes: { type: "string", example: "Negotiated price" },
          },
        },
        DispatchOrderRequest: {
          type: "object",
          additionalProperties: false,
          required: ["transportMode"],
          properties: {
            transportMode: { type: "string", example: "DTDC" },
            trackingRef: { type: "string", example: "D123456789" },
            dispatchedAt: { type: "string", format: "date-time" },
            items: {
              type: "array",
              description: "Optional partial dispatch list. If omitted, all remaining dozens are dispatched.",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["itemId", "dozens"],
                properties: {
                  itemId: { type: "string", format: "uuid" },
                  dozens: { type: "integer", minimum: 1, example: 4 },
                },
              },
            },
          },
        },
        CancelOrderRequest: {
          type: "object",
          additionalProperties: false,
          required: ["cancelReason"],
          properties: {
            cancelReason: { type: "string", example: "Dealer cancelled before dispatch" },
          },
        },
        Permission: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            code: { type: "string", example: "orders.create" },
            name: { type: "string", example: "Create Orders" },
            description: {
              type: "string",
              example: "Create new orders",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        PermissionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Permission" },
          },
          required: ["success", "data"],
        },
        PermissionListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
            },
          },
          required: ["success", "data"],
        },
        Role: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Cashier" },
            description: {
              type: "string",
              example: "Handles order and payment operations",
              nullable: true,
            },
            isSystem: { type: "boolean", example: false },
            isActive: { type: "boolean", example: true },
            createdById: {
              type: "string",
              format: "uuid",
              nullable: true,
              description: "The user ID who created this role",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  roleId: { type: "string", format: "uuid" },
                  permissionId: { type: "string", format: "uuid" },
                  grantedAt: { type: "string", format: "date-time" },
                  permission: { $ref: "#/components/schemas/Permission" },
                },
              },
            },
          },
        },
        RoleResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Role" },
          },
          required: ["success", "data"],
        },
        RoleListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Role" },
            },
          },
          required: ["success", "data"],
        },
        RoleDetail: {
          type: "object",
          description: "Custom role with permissions and assigned users",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            name: { type: "string", example: "Cashier" },
            description: {
              type: "string",
              example: "Handles order and payment operations",
              nullable: true,
            },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  permission: { $ref: "#/components/schemas/Permission" },
                },
              },
            },
            tenantUsers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  user: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string", example: "Ravi Shah" },
                      phone: { type: "string", example: "9876543210" },
                      email: {
                        type: "string",
                        example: "ravi@flowoid.com",
                        nullable: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        RoleAssignment: {
          type: "object",
          description: "Result of assigning/removing a custom role from a user",
          properties: {
            id: { type: "string", format: "uuid" },
            tenantId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            roleId: { type: "string", format: "uuid", nullable: true },
            user: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Ravi Shah" },
                phone: { type: "string", example: "9876543210" },
                email: {
                  type: "string",
                  example: "ravi@flowoid.com",
                  nullable: true,
                },
              },
            },
            role: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Cashier" },
              },
            },
          },
        },
        TenantPermissionsResponse: {
          type: "object",
          properties: {
            tenant: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", example: "Ayanshi Imitation" },
                slug: { type: "string", example: "ayanshi-imitation" },
              },
            },
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
            },
            permissionCodes: {
              type: "array",
              items: { type: "string" },
              example: [
                "orders.view",
                "orders.create",
                "payments.view",
                "payments.create",
              ],
            },
          },
        },
        MyPermissionsResponse: {
          type: "object",
          properties: {
            permissions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string", example: "orders.view" },
                  name: { type: "string", example: "View Orders" },
                  module: { type: "string", example: "orders" },
                  action: { type: "string", example: "view" },
                },
              },
            },
            isFullAccess: {
              type: "boolean",
              example: false,
              description: "True only for SUPER_ADMIN",
            },
          },
        },
        AllPermissionsResponse: {
          type: "object",
          properties: {
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
            },
            grouped: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: { $ref: "#/components/schemas/Permission" },
              },
              example: {
                orders: [
                  {
                    id: "uuid",
                    code: "orders.view",
                    name: "View Orders",
                    module: "orders",
                    action: "view",
                  },
                  {
                    id: "uuid",
                    code: "orders.create",
                    name: "Create Orders",
                    module: "orders",
                    action: "create",
                  },
                ],
              },
            },
          },
        },
      },
    },
    security: [{ accessTokenCookie: [] }, { bearerAuth: [] }],
  },
  apis: ["./src/modules/**/*.routes.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
