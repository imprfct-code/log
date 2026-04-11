import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { NavHeader } from "@/components/NavHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { FullPageLoader } from "@/components/FullPageLoader";

const LandingScreen = lazy(() =>
  import("@/screens/LandingScreen").then((m) => ({ default: m.LandingScreen })),
);
const FeedScreen = lazy(() =>
  import("@/screens/FeedScreen").then((m) => ({ default: m.FeedScreen })),
);
const CreateCommitmentScreen = lazy(() =>
  import("@/screens/CreateCommitmentScreen").then((m) => ({
    default: m.CreateCommitmentScreen,
  })),
);
const CommitmentDetailScreen = lazy(() =>
  import("@/screens/CommitmentDetailScreen").then((m) => ({
    default: m.CommitmentDetailScreen,
  })),
);
const PostDetailScreen = lazy(() =>
  import("@/screens/PostDetailScreen").then((m) => ({ default: m.PostDetailScreen })),
);
const ProfileScreen = lazy(() =>
  import("@/screens/ProfileScreen").then((m) => ({ default: m.ProfileScreen })),
);
const SettingsScreen = lazy(() =>
  import("@/screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })),
);
const ShipFlowScreen = lazy(() =>
  import("@/screens/ShipFlowScreen").then((m) => ({ default: m.ShipFlowScreen })),
);
const NotFoundScreen = lazy(() =>
  import("@/screens/NotFoundScreen").then((m) => ({ default: m.NotFoundScreen })),
);
const SSOCallbackScreen = lazy(() =>
  import("@/screens/SSOCallbackScreen").then((m) => ({ default: m.SSOCallbackScreen })),
);

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
      <Suspense fallback={<FullPageLoader />}>
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
            path="post/:id"
            element={
              <Layout>
                <PostDetailScreen />
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
      </Suspense>
    </BrowserRouter>
  );
}
