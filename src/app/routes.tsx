import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./components/home-page";
import { SalesPage } from "./components/sales-page";
import { CustomersPage } from "./components/customers-page";
import { DealflowPage } from "./components/dealflow-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: "sales", Component: SalesPage },
      { path: "dealflow/:pageId", Component: DealflowPage },
      { path: "customers", Component: CustomersPage },
      { path: "*", Component: HomePage },
    ],
  },
]);