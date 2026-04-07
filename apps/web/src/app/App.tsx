import { BrowserRouter, Routes, Route } from "react-router";
import { NavHeader } from "@/components/NavHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { LandingScreen } from "@/screens/LandingScreen";
import { FeedScreen } from "@/screens/FeedScreen";
import { CreateCommitmentScreen } from "@/screens/CreateCommitmentScreen";
import { CommitmentDetailScreen } from "@/screens/CommitmentDetailScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { ShipFlowScreen } from "@/screens/ShipFlowScreen";
import { NotFoundScreen } from "@/screens/NotFoundScreen";
import { SSOCallbackScreen } from "@/screens/SSOCallbackScreen";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <main>{children}</main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<LandingScreen />} />
        <Route path="sso-callback" element={<SSOCallbackScreen />} />
        <Route
          path="feed"
          element={
            <Layout>
              <FeedScreen />
            </Layout>
          }
        />
        <Route
          path="create"
          element={
            <Layout>
              <RequireAuth>
                <CreateCommitmentScreen />
              </RequireAuth>
            </Layout>
          }
        />
        <Route
          path="commitment/:id"
          element={
            <Layout>
              <CommitmentDetailScreen />
            </Layout>
          }
        />
        <Route
          path="profile/:username"
          element={
            <Layout>
              <ProfileScreen />
            </Layout>
          }
        />
        <Route
          path="settings"
          element={
            <Layout>
              <RequireAuth>
                <SettingsScreen />
              </RequireAuth>
            </Layout>
          }
        />
        <Route
          path="ship/:id"
          element={
            <Layout>
              <RequireAuth>
                <ShipFlowScreen />
              </RequireAuth>
            </Layout>
          }
        />
        <Route
          path="*"
          element={
            <Layout>
              <NotFoundScreen />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
