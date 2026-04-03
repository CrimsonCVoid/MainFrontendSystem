import type { TutorialCategory, TutorialTopic } from "@/lib/tutorial";

/**
 * Tutorial Categories Configuration
 *
 * Comprehensive tutorial system organized into 5 categories with ~15 topics.
 * Each topic can navigate to a specific route and guide users through features.
 */

// ============================================
// GETTING STARTED CATEGORY
// ============================================

const gettingStartedTopics: TutorialTopic[] = [
  {
    id: "welcome-tour",
    title: "Welcome Tour",
    description:
      "A quick overview of MyMetalRoofer and its key features. Perfect for new users.",
    icon: "Sparkles",
    route: "/dashboard",
    estimatedMinutes: 2,
    tags: ["intro", "overview", "beginner", "start"],
    steps: [
      {
        id: "welcome-intro",
        title: "Welcome to MyMetalRoofer!",
        description:
          "MyMetalRoofer helps you measure roofs, create estimates, and close more jobs. Let's get you started!",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "welcome-dashboard",
        title: "Your Command Center",
        description:
          "This is your dashboard. From here, you can access all your projects, view statistics, and manage your business.",
        targetSelector: '[data-tutorial="dashboard-tabs"]',
        placement: "bottom",
        highlightPadding: 8,
      },
      {
        id: "welcome-complete",
        title: "Ready to Go!",
        description:
          "You're all set! Explore the other tutorials to learn about specific features.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
  {
    id: "navigation-basics",
    title: "Navigation Basics",
    description:
      "Learn how to navigate the app using the sidebar, tabs, and quick actions.",
    icon: "Compass",
    route: "/dashboard",
    estimatedMinutes: 2,
    tags: ["navigation", "sidebar", "menu", "basics"],
    steps: [
      {
        id: "nav-sidebar",
        title: "Sidebar Navigation",
        description:
          "The sidebar gives you quick access to Dashboard, Audit logs, Settings, and more. It's always available.",
        targetSelector: '[data-tutorial="sidebar"]',
        placement: "right",
        highlightPadding: 8,
      },
      {
        id: "nav-tabs",
        title: "Dashboard Tabs",
        description:
          "Switch between Overview, Projects, Estimates, and Team using these tabs. Each view shows different information.",
        targetSelector: '[data-tutorial="dashboard-tabs"]',
        placement: "bottom",
        highlightPadding: 8,
      },
      {
        id: "nav-user-menu",
        title: "User Menu",
        description:
          "Access your profile, switch organizations, and sign out from the user menu in the top right.",
        targetSelector: '[data-tutorial="user-menu"]',
        placement: "left",
        highlightPadding: 8,
      },
    ],
  },
];

// ============================================
// PROJECTS CATEGORY
// ============================================

const projectsTopics: TutorialTopic[] = [
  {
    id: "create-project",
    title: "Create a New Project",
    description:
      "Learn how to start a new roofing project from address search to 3D analysis.",
    icon: "FolderPlus",
    route: "/dashboard?tab=projects",
    estimatedMinutes: 3,
    tags: ["project", "create", "new", "address", "property"],
    steps: [
      {
        id: "create-start",
        title: "Start a New Project",
        description:
          "Creating a project is the first step to measuring a roof. Click the New Project button to begin.",
        targetSelector: '[data-tutorial="new-project-btn"]',
        placement: "bottom",
        highlightPadding: 8,
      },
      {
        id: "create-info",
        title: "Project Details",
        description:
          "You'll enter a project name and search for the property address. Our system will find the roof automatically.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "create-sf",
        title: "Square Footage Credits",
        description:
          "Projects use SF credits based on roof size. Monitor your balance here to ensure you have enough credits.",
        targetSelector: '[data-tutorial="sf-pool"]',
        placement: "bottom",
        highlightPadding: 12,
      },
    ],
  },
  {
    id: "view-project",
    title: "View Project Details",
    description:
      "Explore project details, measurements, and roof analysis results.",
    icon: "Eye",
    route: "/dashboard?tab=projects",
    estimatedMinutes: 2,
    tags: ["project", "view", "details", "measurements"],
    requires: ["has-projects"],
    disabledMessage: "Create a project first to view project details",
    steps: [
      {
        id: "view-projects-area",
        title: "Your Projects",
        description:
          "All your roofing projects appear here. Click any project card to view its details.",
        targetSelector: '[data-tutorial="projects-area"]',
        placement: "top",
        highlightPadding: 16,
      },
      {
        id: "view-info",
        title: "Project Information",
        description:
          "Inside a project, you'll see measurements, 3D views, status, and estimate options. Everything you need in one place.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
  {
    id: "3d-viewer",
    title: "Using the 3D Viewer",
    description:
      "Navigate the 3D roof model, understand measurements, and verify accuracy.",
    icon: "Box",
    route: "/dashboard?tab=projects",
    estimatedMinutes: 3,
    tags: ["3d", "viewer", "model", "roof", "measurements", "navigate"],
    requires: ["has-projects"],
    disabledMessage: "Create a project first to use the 3D viewer",
    steps: [
      {
        id: "3d-intro",
        title: "3D Roof Visualization",
        description:
          "Each project includes a 3D model of the roof. This helps you visualize the structure and verify measurements.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "3d-controls",
        title: "Viewer Controls",
        description:
          "Rotate the model by clicking and dragging. Use scroll to zoom in and out. Right-click to pan the view.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "3d-measurements",
        title: "Measurement Details",
        description:
          "The model shows ridge lines, valleys, and individual facets. Each section includes area calculations.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
  {
    id: "project-page-overview",
    title: "Project Page Overview",
    description:
      "Comprehensive guide to navigating the project page, understanding all features, and managing your project.",
    icon: "LayoutDashboard",
    estimatedMinutes: 4,
    tags: ["project", "page", "overview", "tabs", "details", "address", "cad", "collaborators"],
    requires: ["has-projects"],
    disabledMessage: "Open a project page first, then use the Help button there",
    steps: [
      {
        id: "project-intro",
        title: "Project Page Overview",
        description:
          "The project page is your central hub for managing a roofing project. Here you can view details, 3D models, create estimates, and collaborate with team members.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "project-tabs",
        title: "Project Tabs",
        description:
          "Switch between Overview, 3D Model, and Estimation tabs. Each tab provides different tools and information about your project.",
        targetSelector: '[data-tutorial="project-tabs"]',
        placement: "bottom",
        highlightPadding: 8,
      },
      {
        id: "project-details",
        title: "Project Details",
        description:
          "View and edit your project name, description, and key information. Click the edit icon to make changes.",
        targetSelector: '[data-tutorial="project-details"]',
        placement: "bottom",
        highlightPadding: 12,
      },
      {
        id: "project-address",
        title: "Property Address",
        description:
          "The property address and location are shown here with a map preview. This information drives the roof measurement analysis.",
        targetSelector: '[data-tutorial="project-address"]',
        placement: "bottom",
        highlightPadding: 12,
      },
      {
        id: "project-quick-actions",
        title: "Quick Actions",
        description:
          "Use quick actions to jump to the 3D viewer, create estimates, or access other common tasks.",
        targetSelector: '[data-tutorial="project-quick-actions"]',
        placement: "left",
        highlightPadding: 8,
      },
      {
        id: "project-cad",
        title: "CAD Files",
        description:
          "For paid projects, download professional CAD files (DWG, DXF, PDF, CSV) for use in your roofing software.",
        targetSelector: '[data-tutorial="project-cad"]',
        placement: "left",
        highlightPadding: 12,
      },
      {
        id: "project-collaborators",
        title: "Project Collaborators",
        description:
          "Add team members as collaborators to work together on this project. Available for organizations with multiple members.",
        targetSelector: '[data-tutorial="project-collaborators"]',
        placement: "left",
        highlightPadding: 12,
      },
      {
        id: "project-activity",
        title: "Activity Timeline",
        description:
          "Track all changes and actions on this project. See who made changes and when they happened.",
        targetSelector: '[data-tutorial="project-activity"]',
        placement: "top",
        highlightPadding: 12,
      },
    ],
  },
];

// ============================================
// ESTIMATES CATEGORY
// ============================================

const estimatesTopics: TutorialTopic[] = [
  {
    id: "create-estimate",
    title: "Create an Estimate",
    description:
      "Build professional estimates with materials, labor, and pricing options.",
    icon: "Calculator",
    route: "/dashboard?tab=estimates",
    estimatedMinutes: 3,
    tags: ["estimate", "quote", "pricing", "materials", "labor"],
    requires: ["has-projects"],
    disabledMessage: "Create a project first to build estimates",
    steps: [
      {
        id: "estimate-intro",
        title: "Professional Estimates",
        description:
          "Create detailed estimates that help you win more jobs. Include materials, labor, and optional add-ons.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "estimate-project",
        title: "Select a Project",
        description:
          "Estimates are linked to projects. First, select the project you want to create an estimate for.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "estimate-customize",
        title: "Customize Your Estimate",
        description:
          "Add line items, adjust quantities, set pricing tiers. Your estimate automatically calculates totals.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
  {
    id: "share-estimate",
    title: "Share with Clients",
    description:
      "Send professional estimate links to clients for review and approval.",
    icon: "Share2",
    route: "/dashboard?tab=estimates",
    estimatedMinutes: 2,
    tags: ["share", "client", "link", "approve", "signature", "email"],
    requires: ["has-projects"],
    disabledMessage: "Create a project first to share estimates",
    steps: [
      {
        id: "share-intro",
        title: "Client Sharing Portal",
        description:
          "Share estimates with clients via secure links. They can view, ask questions, and approve with a digital signature.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "share-options",
        title: "Sharing Options",
        description:
          "Set expiration dates, require email verification, and add custom notes for your client.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "share-tracking",
        title: "Track Client Activity",
        description:
          "See when clients view your estimate, track their responses, and get notified of approvals.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
];

// ============================================
// SETTINGS & PROFILE CATEGORY
// ============================================

const settingsTopics: TutorialTopic[] = [
  {
    id: "profile-settings",
    title: "Profile Settings",
    description: "Update your personal information, email, and preferences.",
    icon: "User",
    route: "/settings",
    estimatedMinutes: 2,
    tags: ["profile", "account", "personal", "email", "name"],
    steps: [
      {
        id: "profile-intro",
        title: "Your Profile",
        description:
          "Manage your personal settings here. Update your name, email, and notification preferences.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "profile-details",
        title: "Profile Information",
        description:
          "Keep your contact info up to date. This is used for notifications and client communications.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
  {
    id: "company-branding",
    title: "Company Branding",
    description:
      "Customize your company logo, colors, and branding on estimates.",
    icon: "Palette",
    route: "/settings",
    estimatedMinutes: 2,
    tags: ["brand", "logo", "company", "colors", "customize"],
    steps: [
      {
        id: "brand-intro",
        title: "Brand Your Business",
        description:
          "Add your company logo and colors. These appear on all client-facing estimates and communications.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "brand-logo",
        title: "Upload Your Logo",
        description:
          "A professional logo makes your estimates stand out. Upload PNG or SVG format for best quality.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
  {
    id: "organization-settings",
    title: "Organization Settings",
    description:
      "Manage your organization, team permissions, and billing settings.",
    icon: "Building2",
    route: "/dashboard?tab=settings",
    estimatedMinutes: 3,
    tags: ["organization", "org", "team", "billing", "admin"],
    requires: ["is-admin"],
    disabledMessage: "Admin or Owner role required for organization settings",
    steps: [
      {
        id: "org-intro",
        title: "Organization Management",
        description:
          "Configure organization-wide settings. Only admins and owners can access these settings.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "org-members",
        title: "Team Members",
        description:
          "Invite team members, assign roles (Owner, Admin, Member), and manage access permissions.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "org-billing",
        title: "Billing & Subscription",
        description:
          "View your subscription status, purchase SF credits, and manage payment methods.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
];

// ============================================
// NAVIGATION & FEATURES CATEGORY
// ============================================

const navigationTopics: TutorialTopic[] = [
  {
    id: "sf-pool",
    title: "SF Pool Credits",
    description:
      "Understand how square footage credits work and how to purchase more.",
    icon: "Coins",
    route: "/dashboard",
    estimatedMinutes: 2,
    tags: ["sf", "credits", "pool", "purchase", "balance", "square footage"],
    steps: [
      {
        id: "sf-balance",
        title: "Your SF Balance",
        description:
          "The SF Pool shows your available square footage credits. Each project deducts from this balance.",
        targetSelector: '[data-tutorial="sf-pool"]',
        placement: "bottom",
        highlightPadding: 12,
      },
      {
        id: "sf-usage",
        title: "How Credits Work",
        description:
          "Credits are used based on actual roof size. Larger roofs use more credits. Unused credits never expire.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "sf-purchase",
        title: "Purchasing Credits",
        description:
          "Need more credits? Click on the SF Pool to view packages and make a purchase. Volume discounts available!",
        targetSelector: '[data-tutorial="sf-pool"]',
        placement: "bottom",
        highlightPadding: 12,
      },
    ],
  },
  {
    id: "team-overview",
    title: "Team Overview",
    description: "View team activity, member statistics, and collaboration.",
    icon: "Users",
    route: "/dashboard?tab=team",
    estimatedMinutes: 2,
    tags: ["team", "members", "activity", "collaboration"],
    steps: [
      {
        id: "team-intro",
        title: "Team Dashboard",
        description:
          "The Team tab shows all organization members and their activity. Track who's working on what.",
        targetSelector: '[data-tutorial="dashboard-tabs"]',
        placement: "bottom",
        highlightPadding: 8,
      },
      {
        id: "team-members",
        title: "Team Members",
        description:
          "See each member's role, recent projects, and contribution to the organization.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
  {
    id: "quick-stats",
    title: "Dashboard Statistics",
    description: "Understand your dashboard stats and key performance metrics.",
    icon: "BarChart3",
    route: "/dashboard",
    estimatedMinutes: 2,
    tags: ["stats", "metrics", "dashboard", "analytics", "overview"],
    steps: [
      {
        id: "stats-intro",
        title: "Quick Stats",
        description:
          "These cards show your key metrics at a glance: total projects, completed work, and square footage analyzed.",
        targetSelector: '[data-tutorial="quick-stats"]',
        placement: "bottom",
        highlightPadding: 12,
      },
      {
        id: "stats-details",
        title: "Tracking Progress",
        description:
          "Use these stats to track your business growth and identify trends over time.",
        targetSelector: null,
        placement: "center",
      },
    ],
  },
  {
    id: "audit-log",
    title: "Understanding Audit Logs",
    description:
      "Comprehensive guide to reviewing activity history, filtering events, and tracking team actions.",
    icon: "Shield",
    route: "/dashboard?tab=audit",
    estimatedMinutes: 3,
    tags: ["audit", "log", "history", "activity", "changes", "tracking", "security", "compliance"],
    steps: [
      {
        id: "audit-intro",
        title: "Activity Tracking",
        description:
          "The Audit Log tracks all important actions in your organization: project creation, estimate approvals, team changes, SF pool purchases, and more. It's essential for compliance and troubleshooting.",
        targetSelector: null,
        placement: "center",
      },
      {
        id: "audit-stats",
        title: "Activity Overview",
        description:
          "These cards show your activity summary at a glance: today's actions, weekly activity, project count, team members, and total logged entries.",
        targetSelector: '[data-tutorial="audit-stats"]',
        placement: "bottom",
        highlightPadding: 12,
      },
      {
        id: "audit-category-tabs",
        title: "Filter by Category",
        description:
          "Switch between All Activity, Projects, Members, SF & Payments, and Organization to focus on specific types of events.",
        targetSelector: '[data-tutorial="audit-category-tabs"]',
        placement: "bottom",
        highlightPadding: 8,
      },
      {
        id: "audit-time-filters",
        title: "Time Range Filters",
        description:
          "Filter activities by time: All Time, Today, Past Week, or Past Month. Useful for tracking recent changes or investigating issues.",
        targetSelector: '[data-tutorial="audit-time-filters"]',
        placement: "bottom",
        highlightPadding: 8,
      },
      {
        id: "audit-search",
        title: "Search Activities",
        description:
          "Search by user name, project name, or action type to quickly find specific events. The search works across all visible fields.",
        targetSelector: '[data-tutorial="audit-search"]',
        placement: "bottom",
        highlightPadding: 8,
      },
      {
        id: "audit-details",
        title: "View Entry Details",
        description:
          "Click any log entry to expand and see full details including timestamps, users involved, and specific changes made.",
        targetSelector: '[data-tutorial="audit-log-entries"]',
        placement: "top",
        highlightPadding: 12,
      },
    ],
  },
];

// ============================================
// EXPORT ALL CATEGORIES
// ============================================

export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Essential basics to get you up and running quickly",
    icon: "Rocket",
    color: "blue",
    order: 1,
    topics: gettingStartedTopics,
  },
  {
    id: "projects",
    title: "Projects",
    description: "Create and manage roofing projects",
    icon: "Building2",
    color: "emerald",
    order: 2,
    topics: projectsTopics,
  },
  {
    id: "estimates",
    title: "Estimates",
    description: "Build and share professional estimates",
    icon: "FileText",
    color: "purple",
    order: 3,
    topics: estimatesTopics,
  },
  {
    id: "settings",
    title: "Settings & Profile",
    description: "Customize your account and organization",
    icon: "Settings",
    color: "slate",
    order: 4,
    topics: settingsTopics,
  },
  {
    id: "navigation",
    title: "Navigation & Features",
    description: "Master advanced features and navigation",
    icon: "Map",
    color: "amber",
    order: 5,
    topics: navigationTopics,
  },
];

// Flatten all topics for quick access
export const ALL_TOPICS = TUTORIAL_CATEGORIES.flatMap((cat) => cat.topics);

// Get topic by ID
export function getTopicById(topicId: string): TutorialTopic | undefined {
  return ALL_TOPICS.find((topic) => topic.id === topicId);
}

// Get category by ID
export function getCategoryById(categoryId: string): TutorialCategory | undefined {
  return TUTORIAL_CATEGORIES.find((cat) => cat.id === categoryId);
}

// Get category that contains a topic
export function getCategoryForTopic(topicId: string): TutorialCategory | undefined {
  return TUTORIAL_CATEGORIES.find((cat) =>
    cat.topics.some((topic) => topic.id === topicId)
  );
}
