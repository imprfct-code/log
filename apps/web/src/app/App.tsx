import { BrowserRouter, Routes, Route } from "react-router";
import { NavHeader } from "@/components/NavHeader";
import { LandingScreen } from "@/screens/LandingScreen";
import { FeedScreen } from "@/screens/FeedScreen";
import { CreateCommitmentScreen } from "@/screens/CreateCommitmentScreen";
import { CommitmentDetailScreen } from "@/screens/CommitmentDetailScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { ShipFlowScreen } from "@/screens/ShipFlowScreen";
import { NotFoundScreen } from "@/screens/NotFoundScreen";

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
              <CreateCommitmentScreen />
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
          path="ship/:id"
          element={
            <Layout>
              <ShipFlowScreen />
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
