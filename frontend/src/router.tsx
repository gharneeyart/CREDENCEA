import { createBrowserRouter } from "react-router-dom";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import IssuePage from "@/pages/IssuePage";
import StudentPage from "@/pages/StudentPage";
import VerifyPage from "@/pages/VerifyPage";
import AdminPage from "@/pages/AdminPage";
import CertificatePage from "@/pages/CertificatePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "issue", element: <IssuePage /> },
      { path: "student", element: <StudentPage /> },
      { path: "verify", element: <VerifyPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "certificate/:tokenId", element: <CertificatePage /> },
    ],
  },
]);
