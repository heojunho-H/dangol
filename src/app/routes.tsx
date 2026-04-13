import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./components/home-page";
import { SalesPage } from "./components/sales-page";
import { CustomerPage } from "./components/customer-page";
import { DealflowPage } from "./components/dealflow-page";
import { PipelineSettingsPage } from "./components/pipeline-settings-page";
import { FieldSettingsPage } from "./components/field-settings-page";

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
      { path: "customers/:pageId", Component: CustomerPage },
      { path: "*", Component: HomePage },
    ],
  },
]);
