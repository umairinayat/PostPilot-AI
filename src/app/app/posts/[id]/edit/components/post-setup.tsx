"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TONES } from "@/types";

type PostSetupProps = {
  topic: string;
  tone: string;
  onTopicChange: (value: string) => void;
  onToneChange: (value: string) => void;
  onFieldFocus: (field: string) => void;
  onCursorChange: (position: number | null) => void;
};

export function PostSetup({
  topic,
  tone,
  onTopicChange,
  onToneChange,
  onFieldFocus,
  onCursorChange,
}: PostSetupProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Post Setup</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          <Label htmlFor="editor-topic">Topic</Label>
          <Input
            id="editor-topic"
            value={topic}
            onFocus={() => onFieldFocus("topic")}
            onSelect={(event) =>
              onCursorChange(event.currentTarget.selectionStart ?? null)
            }
            onChange={(event) => {
              onFieldFocus("topic");
              onTopicChange(event.target.value);
            }}
            placeholder="What is this post about?"
          />
        </div>
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select
            value={tone}
            onValueChange={(value) => {
              onFieldFocus("tone");
              onToneChange(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((availableTone) => (
                <SelectItem key={availableTone} value={availableTone}>
                  {availableTone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
