import { Route, Routes } from "react-router-dom"

import { OrderDetailPage } from "@/pages/OrderDetailPage"
import { OrdersPage } from "@/pages/OrdersPage"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OrdersPage />} />
      <Route path="/orders/:orderId" element={<OrderDetailPage />} />
    </Routes>
  )
}
