import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }      from './context/AuthContext';
import { LanguageProvider }  from './context/LanguageContext';
import { SupplierProvider }  from './context/SupplierContext';
import { ItemsProvider }     from './context/ItemsContext';
import { DocumentsProvider } from './context/DocumentsContext';
import Login    from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/DashboardLayout';

// Manager Pages
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage';
import Suppliers    from './pages/manager/Suppliers';
import AddSupplierPage from './pages/manager/AddSupplierPage';
import Procurement  from './pages/manager/Procurement';
import Acts         from './pages/manager/Acts';
import Approvals    from './pages/manager/Approvals';
import AnalyticsPage from './pages/manager/AnalyticsPage';

// Worker Pages
import WorkerDashboardPage from './pages/worker/WorkerDashboardPage';
import Receiving      from './pages/worker/Receiving';
import Issuing        from './pages/worker/Issuing';
import InventoryCheck from './pages/worker/InventoryCheck';
import WriteOffs      from './pages/worker/WriteOffs';
import Returns        from './pages/worker/Returns';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SupplierProvider>
          <ItemsProvider>
            <DocumentsProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login"    element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Manager Routes */}
                  <Route path="/manager" element={<DashboardLayout requiredRole="manager" />}>
                    <Route index           element={<ManagerDashboardPage />} />
                    <Route path="suppliers"        element={<Suppliers />} />
                    <Route path="suppliers/add"    element={<AddSupplierPage />} />
                    <Route path="suppliers/edit/:id" element={<AddSupplierPage />} />
                    <Route path="procurement"      element={<Procurement />} />
                    <Route path="documents"        element={<Acts />} />
                    <Route path="approvals"        element={<Approvals />} />
                    <Route path="analytics"        element={<AnalyticsPage />} />
                  </Route>

                  {/* Worker Routes */}
                  <Route path="/worker" element={<DashboardLayout requiredRole="worker" />}>
                    <Route index              element={<WorkerDashboardPage />} />
                    <Route path="receiving"       element={<Receiving />} />
                    <Route path="issuing"         element={<Issuing />} />
                    <Route path="inventory-check" element={<InventoryCheck />} />
                    <Route path="write-offs"      element={<WriteOffs />} />
                    <Route path="returns"         element={<Returns />} />
                  </Route>

                  <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
              </BrowserRouter>
            </DocumentsProvider>
          </ItemsProvider>
        </SupplierProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
