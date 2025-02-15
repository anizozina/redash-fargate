## これはなに

- Re:dash を ECS Fargate で構築するためのスクリプト

## 構成

```mermaid
graph TD;
    subgraph VPC
        subgraph Public_Subnet
            D[ALB] 
            G[ECS Service] 
        end

        subgraph Private_Subnet
            E[RDS Instance] 
            F[Redis Instance] 
        end
    end

    Public_Subnet
    Public_Subnet
    Private_Subnet 
    Private_Subnet

    Request --> D
    D --> G
    G --> E
    G --> F

    style D fill:#99ff99,stroke:#333,stroke-width:2px;
    style E fill:#ff6600,stroke:#333,stroke-width:2px;
    style F fill:#ff9900,stroke:#333,stroke-width:2px;
    style G fill:#ccffcc,stroke:#333,stroke-width:2px;
```

## Google Login

1. Google Cloud Console に Project を作成
1. APIとサービス > OAuth 同意画面から情報の登録
    1. 必須項目だけ入力
    1. スコープやらはなくて大丈夫
1. APIとサービス > 認証情報からOAuth クライアント IDを作成
    1. アプリケーションの種類はウェブアプリケーション
    1. コールバックURLに CfnのOutputにある `GoogleLoginCallbackURL` を設定
1. `client_id` と `client_secret` をコピーして シークレットマネージャーに追記する

