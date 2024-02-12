import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Handles from "./Handles";
import { NodeProps } from "reactflow";

const Terminal = (props: NodeProps) => {
  const displayName = `${props.data.type} ${props.data.id}`;
  const nodeId = `${props.data.type}_${props.data.id}`;
  return (
    <>
      <Sheet>
        <SheetTrigger>
          <div className="h-4 w-4 bg-terminal">
            <header className="flex items-center justify-center w-full h-full">
              <p className="uppercase text-white">{props.data.id}</p>
            </header>
          </div>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="uppercase">{displayName}</SheetTitle>
            <SheetDescription>
              Created at: {new Date(props.data.createdAt).toLocaleString()}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
      <Handles nodeId={nodeId} />
    </>
  );
};

export default Terminal;
