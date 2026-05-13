window.TRPG_PORTAL_I18N = {
  defaultLanguage: "ja",

  ui: {
    ja: {
      meta: {
        title: "TRPG WEBツール観測所",
        description:
          "TRPGセッション準備・ログ解析・卓報告作成・シナリオ情報整理を補助するためのWebツール観測所です。",
      },
      header: {
        eyebrow: "TRPG セッション支援ツール",
        subtitle: "星明かりのポータル / ツール観測所",
      },
      hero: {
        label: "自作TRPG Webツール集",
        title: "TRPG WEBツール観測所",
        lead:
          "TRPG準備・ログ解析・卓報告・シナリオ整理を支援するポータルです。星図のように並ぶツールから、目的に合うものを選択してください。",
      },
      search: {
        placeholder: "ツールを検索...",
      },
      status: {
        available: "使用可能",
        production: "開発中",
        idea: "アイデア",
      },
      categories: {
        all: "すべて",
        logAnalysis: "ログ解析",
        reportWriting: "卓報告",
        scenarioPrep: "シナリオ準備",
        characterUtility: "キャラクター支援",
        haishinTracking: "配信観測",
        gmSupport: "GM支援",
      },
      mode: {
        switchToDawn: "Dawn",
        switchToDeepSpace: "Deep Space",
        ariaToDawn: "Dawnモードに切り替え",
        ariaToDeepSpace: "Deep Spaceモードに切り替え",
      },
      toolAction: {
        open: "ツールを開く →",
        comingSoon: "Coming Soon",
        developmentPreview: "デザインだけ先に見る",
      },
      empty: {
        title: "該当するツールがありません",
        text: "検索キーワードまたはカテゴリ条件に一致するツールが見つかりませんでした。",
      },
      footer: {
        copy: "© TRPG WEBツール観測所 / Created for TRPG Session Support",
      },
    },

    en: {
      meta: {
        title: "TRPG Web Tools Observatory",
        description:
          "A tool observatory for TRPG session preparation, log analysis, session report creation, and scenario information organization.",
      },
      header: {
        eyebrow: "TRPG SESSION SUPPORT TOOLS",
        subtitle: "Starlit Portal / Tool Observatory",
      },
      hero: {
        label: "Custom TRPG Web Tool Suite",
        title: "TRPG Web Tools Observatory",
        lead:
          "A portal for TRPG prep, log analysis, session reports, and scenario organization. Choose the tool that fits your purpose from the constellation below.",
      },
      search: {
        placeholder: "Search tools...",
      },
      status: {
        available: "Available",
        production: "In Development",
        idea: "Idea",
      },
      categories: {
        all: "All",
        logAnalysis: "Log Analysis",
        reportWriting: "Report Writing",
        scenarioPrep: "Scenario Prep",
        characterUtility: "Character Utility",
        haishinTracking: "Haishin Tracking",
        gmSupport: "GM Support",
      },
      mode: {
        switchToDawn: "Dawn",
        switchToDeepSpace: "Deep Space",
        ariaToDawn: "Switch to dawn mode",
        ariaToDeepSpace: "Switch to deep space mode",
      },
      toolAction: {
        open: "Open Tool →",
        comingSoon: "Coming Soon",
        developmentPreview: "Preview the design first",
      },
      empty: {
        title: "No tools found",
        text: "Search keyword or category filter did not match any tool.",
      },
      footer: {
        copy: "© TRPG Web Tools Observatory / Created for TRPG Session Support",
      },
    },
  },

  statuses: {
    available: {
      className: "status-available",
      icon: "✓",
    },
    production: {
      className: "status-production",
      icon: "⚙",
    },
    idea: {
      className: "status-idea",
      icon: "✦",
    },
  },

  tools: [
    {
      id: "dice-stat-analyst",
      icon: "📊",
      status: "available",
      category: "logAnalysis",
      href: "./dice-stat-analyst/",
      name: {
        ja: "ダイス解析アナライザー",
        en: "Dice Stat Analyst",
      },
      description: {
        ja: "セッションログHTML / テキストから、探索者ごとの成功率・クリティカル・ファンブル・出目分布を解析します。",
        en: "Analyze session logs and review each character’s success rate, criticals, fumbles, and dice roll distribution.",
      },
    },

    {
      id: "coc-growth-checker",
      icon: "🌱",
      status: "production",
      category: "logAnalysis",
      href: "./coc-growth-checker/",
      name: {
        ja: "CoC 6版/7版成長ツール",
        en: "CoC 6e/7e Growth Checker",
      },
      description: {
        ja: "セッションログから、CoC 6版・7版の成長チェック対象技能をハウスルール別に抽出・整理します。",
        en: "Extract and organize CoC 6e/7e growth check candidates from session logs according to selected house rules.",
      },
    },
    {
      id: "session-report-generator",
      icon: "📝",
      status: "production",
      category: "reportWriting",
      href: "./session-report-generator/",
      name: {
        ja: "卓報告ジェネレーター",
        en: "Session Report Generator",
      },
      description: {
        ja: "KP・PL・PC情報を入力し、X/Twitter向けの卓報告文を生成・編集・プレビューします。",
        en: "Generate, edit, and preview session report posts for X/Twitter by entering KP, PL, and PC information.",
      },
    },
    {
      id: "scenario-info-snippet-builder",
      icon: "✂️",
      status: "production",
      category: "scenarioPrep",
      href: "./scenario-snippet-builder/",
      name: {
        ja: "シナリオ情報カード作成ツール",
        en: "Scenario Info Snippet Builder",
      },
      description: {
        ja: "シナリオ情報、探索箇所、資料、技能成功情報などをCCFOLIA / Discord向けに整形します。",
        en: "Format scenario information, investigation points, documents, and skill-success snippets for CCFOLIA or Discord.",
      },
    },
    {
      id: "trpg-hashtag-searcher",
      icon: "#️⃣",
      status: "production",
      category: "haishinTracking",
      href: "./trpg-hashtag-searcher/",
      name: {
        ja: "使えるハッシュタグ検索",
        en: "Usable Hashtag Finder",
      },
      description: {
        ja: "TRPG配信や卓報告に使えるハッシュタグを、シナリオ名・配信名・関連語句から探しやすくする検索支援ツールです。",
        en: "A hashtag search support tool for finding usable hashtags for TRPG livestreams, session reports, scenarios, and related keywords.",
      },
    },

    {
      id: "chat-palette-formatter",
      icon: "💬",
      status: "production",
      category: "characterUtility",
      href: "",
      name: {
        ja: "チャットパレット整形ツール",
        en: "Chat Palette Formatter",
      },
      description: {
        ja: "CoC 6版・7版のチャットパレットを判定し、読みやすい形式へ整形するツール構想です。",
        en: "A tool concept for formatting CoC 6e/7e chat palettes into a cleaner and more readable structure.",
      },
    },
    {
      id: "charamemo-generator",
      icon: "📋",
      status: "idea",
      category: "characterUtility",
      href: "",
      name: {
        ja: "キャラメモ抽出ツール",
        en: "Charamemo Generator",
      },
      description: {
        ja: "いあきゃらのキャラクター情報から、キャラメモやコマ用データを生成するツール構想です。",
        en: "A tool concept for generating character memo and token-ready data from Iachara character information.",
      },
    },
    {
      id: "trpg-haishin-observatory",
      icon: "🔭",
      status: "idea",
      category: "haishinTracking",
      href: "",
      name: {
        ja: "TRPG配信観測所",
        en: "TRPG Haishin Observatory",
      },
      description: {
        ja: "YouTubeのTRPG配信予定を整理し、シナリオ・チャンネル・GM/KP/PL・ハッシュタグから検索、Fav管理する観測ツール構想です。",
        en: "A future observatory tool for tracking TRPG livestream schedules and filtering by scenario, channel, GM/KP/PL, hashtag, and favorites.",
      },
    },
    {
      id: "trpg-scenario-organizer",
      icon: "🗂️",
      status: "idea",
      category: "scenarioPrep",
      href: "",
      name: {
        ja: "TRPG Scenario Organizer",
        en: "TRPG Scenario Organizer",
      },
      description: {
        ja: "BOOTHやPixivなどで見つけたTRPGシナリオを、システム・人数・時間・秘匿有無・テーマ・お気に入り数などで整理、検索するデータベース構想です。",
        en: "A future database concept for organizing TRPG scenarios by system, player count, playtime, hidden handouts, themes, and favorites.",
      },
    },
    {
      id: "gm-charashi-viewer",
      icon: "👥",
      status: "idea",
      category: "gmSupport",
      href: "",
      name: {
        ja: "GM Charashi Viewer",
        en: "GM Character Sheet Viewer",
      },
      description: {
        ja: "KP / GM向けに、複数のキャラクターシートを一画面で確認・管理するビューア構想です。",
        en: "A GM/KP support concept for viewing and managing multiple character sheets on one screen.",
      },
    },
  ],
};