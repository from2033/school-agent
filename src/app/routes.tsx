import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import UploadQuestion from "./pages/UploadQuestion";
import Analysis from "./pages/Analysis";
import TeacherMessages from "./pages/TeacherMessages";
import QuestionHistory from "./pages/QuestionHistory";
import Root from "./pages/Root";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "upload", Component: UploadQuestion },
      { path: "analysis", Component: Analysis },
      { path: "messages", Component: TeacherMessages },
      { path: "history", Component: QuestionHistory },
    ],
  },
]);
