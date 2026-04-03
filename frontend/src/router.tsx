import { Navigate, createBrowserRouter } from "react-router-dom";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import StudentPage from "@/pages/StudentPage";
import VerifyPage from "@/pages/VerifyPage";
import CertificatePage from "@/pages/CertificatePage";
import AdminDashboardLayout from "@/pages/admin/AdminDashboardLayout";
import AdminFormsPage from "@/pages/admin/AdminFormsPage";
import AdminInstitutionsPage from "@/pages/admin/AdminInstitutionsPage";
import InstitutionBulkIssuePage from "@/pages/institution/InstitutionBulkIssuePage";
import InstitutionDashboardLayout from "@/pages/institution/InstitutionDashboardLayout";
import InstitutionFormsPage from "@/pages/institution/InstitutionFormsPage";
import InstitutionHistoryPage from "@/pages/institution/InstitutionHistoryPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "issue",
        element: <InstitutionDashboardLayout />,
        children: [
          { index: true, element: <Navigate to="forms" replace /> },
          { path: "forms", element: <InstitutionFormsPage /> },
          { path: "history", element: <InstitutionHistoryPage /> },
          { path: "bulk", element: <InstitutionBulkIssuePage /> },
        ],
      },
      { path: "student", element: <StudentPage /> },
      { path: "verify", element: <VerifyPage /> },
      {
        path: "admin",
        element: <AdminDashboardLayout />,
        children: [
          { index: true, element: <Navigate to="institutions" replace /> },
          { path: "institutions", element: <AdminInstitutionsPage /> },
          { path: "forms", element: <AdminFormsPage /> },
        ],
      },
      { path: "certificate/:tokenId", element: <CertificatePage /> },
    ],
  },
]);
