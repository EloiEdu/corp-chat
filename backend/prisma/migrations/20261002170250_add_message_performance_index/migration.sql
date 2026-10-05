-- CreateIndex
CREATE INDEX "messages_channelId_createdAt_id_idx" ON "messages"("channelId", "createdAt", "id");
