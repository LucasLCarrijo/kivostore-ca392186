import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import CreateProduct from "./pages/CreateProduct";
import CourseBuilder from "./pages/CourseBuilder";
import StorefrontEditor from "./pages/StorefrontEditor";
import PublicStorefront from "./pages/PublicStorefront";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Upsell from "./pages/Upsell";
import MemberLogin from "./pages/MemberLogin";
import MemberDashboard from "./pages/MemberDashboard";
import MemberCourse from "./pages/MemberCourse";
import Affiliates from "./pages/Affiliates";
import AffiliateApply from "./pages/AffiliateApply";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import Leads from "./pages/Leads";
import LeadSegments from "./pages/LeadSegments";
import LeadEmail from "./pages/LeadEmail";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Onboarding (protected but no workspace required) */}
              <Route 
                path="/onboarding" 
                element={
                  <ProtectedRoute requireWorkspace={false}>
                    <Onboarding />
                  </ProtectedRoute>
                } 
              />
              
              {/* Dashboard routes (protected with workspace required) */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Placeholder routes for sidebar navigation */}
              <Route 
                path="/earnings" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <div className="p-6">
                        <h1 className="text-2xl font-bold">Renda</h1>
                        <p className="text-muted-foreground">Acompanhe suas vendas e ganhos</p>
                      </div>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              
              {/* Products routes */}
              <Route 
                path="/products" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Products />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/products/new" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <CreateProduct />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/products/:id/course-builder" 
                element={
                  <ProtectedRoute>
                    <CourseBuilder />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/store" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <div className="p-6">
                        <h1 className="text-2xl font-bold">Minha Loja</h1>
                        <p className="text-muted-foreground">Gerencie seus produtos e configurações</p>
                      </div>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/store/editor" 
                element={
                  <ProtectedRoute>
                    <StorefrontEditor />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Analytics />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/clients" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <div className="p-6">
                        <h1 className="text-2xl font-bold">Clientes</h1>
                        <p className="text-muted-foreground">Gerencie seus clientes e leads</p>
                      </div>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <div className="p-6">
                        <h1 className="text-2xl font-bold">Configurações</h1>
                        <p className="text-muted-foreground">Configurações da conta e da loja</p>
                      </div>
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Affiliates — creator dashboard */}
              <Route 
                path="/affiliates" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Affiliates />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />

              {/* Leads & CRM */}
              <Route 
                path="/leads" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Leads />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/leads/segments" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <LeadSegments />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/leads/email" 
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <LeadEmail />
                    </DashboardLayout>
                  </ProtectedRoute>
                } 
              />

              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Checkout — public */}
              <Route path="/checkout/:productSlug" element={<Checkout />} />
              
              {/* Post-purchase — public */}
              <Route path="/order/success/:orderId" element={<OrderSuccess />} />
              <Route path="/upsell/:offerId" element={<Upsell />} />
              
              {/* Member area — public (has own auth) */}
              <Route path="/member/login" element={<MemberLogin />} />
              <Route path="/member" element={<MemberDashboard />} />
              <Route path="/member/course/:productId" element={<MemberCourse />} />

              {/* Affiliate — public pages */}
              <Route path="/affiliate/apply/:workspaceSlug" element={<AffiliateApply />} />
              <Route path="/affiliate/dashboard" element={<AffiliateDashboard />} />
              
              {/* Public storefront — must be before 404 */}
              <Route path="/:slug" element={<PublicStorefront />} />
              
              {/* 404 - Must be last */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;