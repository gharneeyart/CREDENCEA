import { Navigate, createBrowserRouter } from "react-router-dom";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import StudentPage from "@/pages/StudentPage";
import VerifyPage from "@/pages/VerifyPage";
import CertificatePage from "@/pages/CertificatePage";
import AdminDashboardLayout from "@/pages/admin/AdminDashboardLayout";
import AdminApplicationsPage from "@/pages/admin/AdminApplicationsPage";
import AdminFormsPage from "@/pages/admin/AdminFormsPage";
import AdminInstitutionsPage from "@/pages/admin/AdminInstitutionsPage";
import InstitutionBulkIssuePage from "@/pages/institution/InstitutionBulkIssuePage";
import InstitutionDashboardLayout from "@/pages/institution/InstitutionDashboardLayout";
import InstitutionFormsPage from "@/pages/institution/InstitutionFormsPage";
import InstitutionHistoryPage from "@/pages/institution/InstitutionHistoryPage";
import OnboardPage from "@/pages/onboard/OnboardPage";
import OnboardStatusPage from "@/pages/onboard/OnboardStatusPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "onboard", element: <OnboardPage /> },
      { path: "onboard/status", element: <OnboardStatusPage /> },
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
          { index: true, element: <Navigate to="applications" replace /> },
          { path: "applications", element: <AdminApplicationsPage /> },
          { path: "institutions", element: <AdminInstitutionsPage /> },
          { path: "forms", element: <AdminFormsPage /> },
        ],
      },
      { path: "certificate/:tokenId", element: <CertificatePage /> },
    ],
  },
]);
