import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./components/home-page";
import { SalesPage } from "./components/sales-page";
import { CustomerDashboardPage } from "./components/customer-dashboard-page";
import { DashboardPage } from "./components/dashboard-page";
import { CustomerPage } from "./components/customer-page";
import { DealflowPage } from "./components/dealflow-page";
import { PipelineSettingsPage } from "./components/pipeline-settings-page";
import { FieldSettingsPage } from "./components/field-settings-page";
import { LoginPage } from "./components/login-page";
import { SignupPage } from "./components/signup-page";
import { RequireAuth } from "./components/require-auth";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/signup", Component: SignupPage },
  {
    path: "/",
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, Component: HomePage },
      { path: "dashboard", Component: DashboardPage },
      { path: "sales", Component: SalesPage },
      { path: "dealflow/:pageId/:viewType?", Component: DealflowPage },
      { path: "settings/pipeline", Component: PipelineSettingsPage },
      { path: "settings/fields", Component: FieldSettingsPage },
      { path: "customers", Component: CustomerDashboardPage },
      { path: "customers/:pageId/:viewType?", Component: CustomerPage },
      { path: "*", Component: HomePage },
    ],
  },
]);
