import FileUpload from "../FileUpload";

export default function FileUploadExample() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <FileUpload onUploadComplete={() => console.log("Upload complete!")} />
    </div>
  );
}
