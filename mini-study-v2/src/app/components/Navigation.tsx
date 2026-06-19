import { Link, useLocation } from "react-router";
import { Home, Upload, BarChart3, MessageSquare, History } from "lucide-react";

export default function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: Home, label: "首页" },
    { path: "/upload", icon: Upload, label: "上传" },
    { path: "/analysis", icon: BarChart3, label: "分析" },
    { path: "/messages", icon: MessageSquare, label: "消息" },
    { path: "/history", icon: History, label: "历史" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-3 px-4 transition-colors ${
                  isActive ? "text-blue-600" : "text-gray-600"
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
