import os
import sys

video_path = r"C:\Users\HP\Downloads\IMG_0477.MOV"
output_dir = r"C:\Users\HP\.gemini\antigravity\brain\9910895b-46ad-4d88-b824-a450caf2c165"

try:
    import cv2
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    print(f"Total frames: {total_frames}, FPS: {fps}")

    frame_indices = [int(total_frames * ratio) for ratio in [0.1, 0.3, 0.5, 0.7, 0.9]]
    for idx, frame_idx in enumerate(frame_indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if ret:
            out_path = os.path.join(output_dir, f"video_frame_{idx}.jpg")
            cv2.imwrite(out_path, frame)
            print(f"Saved frame {idx} to {out_path}")
    cap.release()
except Exception as e:
    print("CV2 Error:", e)
