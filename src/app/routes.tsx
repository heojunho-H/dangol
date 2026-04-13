import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./components/home-page";
import { SalesPage } from "./components/sales-page";
import { CustomerHubPage } from "./components/customer-hub-page";
import { CustomerDashboardPage } from "./components/customer-dashboard-page";
import { DealflowPage } from "./components/dealflow-page";
import { PipelineSettingsPage } from "./components/pipeline-settings-page";
import { FieldSettingsPage } from "./components/field-settings-page";
import { CustomerLifecycleSettingsPage } from "./components/customer-lifecycle-settings-page";
import { CustomerFieldsSettingsPage } from "./components/customer-fields-settings-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "sales", Component: SalesPage },
      { path: "dealflow/:pageId/:viewType?", Component: DealflowPage },
      { path: "settings/pipeline", Component: PipelineSettingsPage },
      { path: "settings/fields", Component: FieldSettingsPage },
      { path: "settings/customer-lifecycle", Component: CustomerLifecycleSettingsPage },
      { path: "settings/customer-fields", Component: CustomerFieldsSettingsPage },
      { path: "customer-dashboard", Component: CustomerDashboardPage },
      { path: "customers", element: <Navigate to="/customers/all" replace /> },
      { path: "customers/:pageId/:viewType?", Component: CustomerHubPage },
      { path: "*", Component: HomePage },
    ],
  },
]);