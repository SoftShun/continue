import { History } from "../../components/History";
import { Chat } from "./Chat";

export default function GUI() {
  return (
    <div className="flex w-screen flex-row overflow-hidden">
      {/* 기존 History 사이드바를 임시로 숨김 - 새로운 토글 사이드바 사용 */}
      {/* <aside className="4xl:flex border-vsc-input-border no-scrollbar hidden w-96 overflow-y-auto border-0 border-r border-solid">
        <History />
      </aside> */}
      <main className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
        <Chat />
      </main>
    </div>
  );
}
