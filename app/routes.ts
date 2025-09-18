import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("routes/landing.tsx"), route("/dashboard", "routes/dashboard.tsx"), route("/scan", "routes/scan.tsx"),] satisfies RouteConfig;
