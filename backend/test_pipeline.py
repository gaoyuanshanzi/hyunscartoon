import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from agents.storyboard_agent import StoryboardAgent
from agents.consistency_agent import ConsistencyAgent
from agents.image_agent import ImageGenerationAgent
from agents.bubble_agent import SpeechBubbleAgent

TEST_STORY = """
Seoul Hongdae alley. A small cafe called 'Starlight' run by 28-year-old Minu.
He opens every morning at 7 alone. One rainy day, a stranger named Jia 
came in from the rain and typed her novel for 3 hours. Minu silently 
refilled her coffee cup whenever it was empty. Jia looked up and smiled.
That was all. The next day, and the day after, Jia sat at the same seat.
One Monday morning, Jia did not appear. Minu realized for the first time 
how large the cafe was. A week later, Jia returned with two books in hand.
One was her own novel. The other was a gift. Minu took the book and for
the first time spoke first. Would you like to order something? Today I want
to serve you myself.
"""

async def main():
    print("=== Webtoon Generation Test ===")

    # 1. Storyboard
    print("\n[1] Storyboard Agent running...")
    sb = StoryboardAgent()
    storyboard = await sb.generate_storyboard(TEST_STORY, "romance")
    print(f"  Title: {storyboard['title']}")
    print(f"  Main char: {storyboard['main_character']}")
    print(f"  Cuts: {len(storyboard['cuts'])}")

    # 2. Consistency
    print("\n[2] Consistency Agent running...")
    cs = ConsistencyAgent()
    profile = cs.create_character_profile(storyboard['main_character'], TEST_STORY, "romance")
    cuts = cs.inject_consistency(storyboard['cuts'], profile)
    print(f"  Seed: {profile['seed']}")
    print(f"  Anchor: {profile['anchor_token'][:60]}...")

    # 3. Image generation (first 3 cuts, PIL fallback)
    print("\n[3] Image Agent running (3 cuts, PIL fallback)...")
    img_agent = ImageGenerationAgent(session_id="test_session")

    done_count = [0]
    async def progress_cb(cut_idx, total, path):
        done_count[0] += 1
        print(f"  -> Cut {cut_idx}/{total}: {os.path.basename(path)}")

    test_cuts = cuts[:3]
    results = await img_agent.generate_all(test_cuts, progress_cb, max_parallel=2)

    # 4. Speech bubble
    print("\n[4] Bubble Agent running...")
    bubble = SpeechBubbleAgent()
    for r in results:
        out_path = r['image_path'].replace('.png', '_bubble.png')
        bubble.compose(r, r['image_path'], out_path)
        print(f"  -> {os.path.basename(out_path)} composed")

    print("\n=== ALL TESTS PASSED ===")
    print(f"Output dir: {img_agent.session_dir}")

asyncio.run(main())
