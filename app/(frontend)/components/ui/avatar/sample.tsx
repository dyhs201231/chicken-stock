import Avatar from ".";

export default function AvatarSample() {
  return (
    <div className="flex w-fit flex-col gap-4 rounded border p-5">
      <h1>Avatar Sample</h1>

      <div className="flex gap-5">
        <Avatar src="/test-image.webp" type="header" />
        <Avatar src="/test-image.webp" type="main" />
        <Avatar src="/test-image.webp" type="portfolio-mini-circle" />
        <Avatar src="/test-image.webp" type="portfolio-mini-square" />
        <Avatar src="/test-image.webp" type="stock-detail" />
        <Avatar src="/test-image.webp" type="mypage" />
      </div>
    </div>
  );
}
