---
config:
  layout: dagre
  theme: redux-color
---
flowchart LR

    %% =========================
    %% API GATEWAY
    %% =========================
    subgraph GATEWAY["API Gateway"]
        NGINX_CONSOLE["Nginx Console"]
        NGINX_ENTERPRISE["Nginx Enterprise"]
        NGINX_TRANSACTION["Nginx Transaction"]
    end
    NGINX_CONSOLE --> SERVICE_CONSOLE
    NGINX_ENTERPRISE --> SERVICE_ENTERPRISE
    NGINX_TRANSACTION --> SERVICE_TRANSACTION
    
    %% =========================
    %% SERVICES
    %% =========================
    subgraph SERVICES["Application Services"]
        SERVICE_CONSOLE["Console"]
        SERVICE_ENTERPRISE["Enterprise"]
        SERVICE_TRANSACTION["Transaction"]
    end
    SERVICE_CONSOLE --> REDIS & PG & GOOGLE_AUTH
    SERVICE_CONSOLE -- Private --> ORDER_SERVICE & CATALOG_SERVICE & INVENTORY_SERVICE & BILLING_SERVICE & ACCESS_CONTROL
    SERVICE_ENTERPRISE --> REDIS & PG
    SERVICE_ENTERPRISE -- Private --> ORDER_SERVICE & CATALOG_SERVICE & INVENTORY_SERVICE & BILLING_SERVICE
    SERVICE_TRANSACTION --> REDIS & PG
    SERVICE_TRANSACTION -- Private --> ORDER_SERVICE & CATALOG_SERVICE & ACCESS_CONTROL


    %% =========================
    %% INFRASTRUCTURE
    %% =========================
    subgraph INFRA["Infrastructure"]
        REDIS[("Redis")]
        PG[("PostgreSQL")]
    end

    %% =========================
    %% CORE
    %% =========================
    subgraph CORE["Core"]
        CATALOG_SERVICE["Catalog Service"]
        ORDER_SERVICE["Order Service"]
        INVENTORY_SERVICE["Inventory Service"]
        BILLING_SERVICE["Billing Service"]
    end

    %% =========================
    %% THRID PARTY
    %% =========================
    subgraph THIRD_PARTY["Third Party"]
        GOOGLE_AUTH["Google Auth"]
    end
    
    %% =========================
    %% WEB
    %% =========================
    subgraph WEB["Web"]
        PORTAL_CONSOLE["Portal Console"] --> NGINX_CONSOLE
        PORTAL_ENTERPRISE["Portal Enterprise"] --> NGINX_ENTERPRISE
        WEBVIEW["Webview"] --> NGINX_TRANSACTION
    end

    %% =========================
    %% HOST
    %% =========================
    subgraph HOST["Host"]
        HOST_SERVER["Host Server"] ---> NGINX_TRANSACTION
        HOST_APP["App"] --> HOST_SERVER 
        HOST_APP --> WEBVIEW
    end

    %% =========================
    %% ACCESS CONTROL
    %% =========================
    subgraph ACCESS_CONTROL["Access Control"]
        ACCESS_SERVICE["Access Service"]
    end
    
    
