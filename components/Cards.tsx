"use client";

import { PureUserProblemStatus } from "../types/tentacle";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Box,
	ChakraProvider,
	Container,
	IconButton,
	SimpleGrid,
	Stack,
	Tooltip,
	useToast,
} from "@chakra-ui/react";
import { RepeatIcon, TriangleDownIcon } from "@chakra-ui/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useInterval, useWindowSize } from "react-use";
import { UserCard } from "./UserCard";
import LuoguTokenDialog from "./LuoguTokenDialog";
import NoSSR from "./NoSSR";
import { UpdateButton } from "./UpdateButton";

function Cards({
	initialData,
}: {
	initialData: Record<string, PureUserProblemStatus>;
}) {
	const [refreshLoading, setRefreshLoading] = useState(false);
	const [nextPageLoading, setNextPageLoading] = useState(false);

	const nextTimer = useRef<number | null>(null);

	const toast = useToast();

	const [data, setData] = useState(initialData);

	const [start, setStart] = useState(0);

	const { width } = useWindowSize();

	const visibleCardCount = useMemo(() => {
		return Math.floor(Math.min(width, 1280) / 300);
	}, [width]);

	const displayCardCount = useMemo(() => {
		return Math.min(visibleCardCount, Object.keys(data).length);
	}, [data, visibleCardCount]);

	const updateInterval = useMemo(() => {
		return 1000 * 5 * displayCardCount;
	}, [displayCardCount]);

	const refresh = useCallback(async () => {
		if (refreshLoading) {
			return;
		}

		setRefreshLoading(true);
		const res = await fetch("/api/data");
		if (res.status === 200) {
			const data = await res.json();
			setData(data);
		}
		setRefreshLoading(false);
	}, [refreshLoading]);

	useInterval(async () => {
		await refresh();
	}, updateInterval * 8);

	const sortedData = useMemo(() => {
		return Object.entries(data).sort((a, b) => {
			return -(a[1].rank - b[1].rank);
		});
	}, [data]);

	const cards = useMemo(() => {
		return sortedData.map(([name, status]) => {
			return <UserCard key={name} name={name} status={status} />;
		});
	}, [sortedData]);

	const visibleCards = useMemo(() => {
		const _cards = [];
		for (let i = start; i < start + displayCardCount; i++) {
			_cards.push(cards[i % cards.length]);
			if (_cards.length >= cards.length) {
				break;
			}
		}
		return _cards;
	}, [start, displayCardCount, cards]);

	const goNext = useCallback(() => {
		setStart((start + displayCardCount) % cards.length);
	}, [start, displayCardCount, cards.length]);

	const resetNextTimer = useCallback(() => {
		if (nextTimer.current !== null) {
			clearTimeout(nextTimer.current);
		}
		nextTimer.current = window.setTimeout(() => {
			goNext();
		}, updateInterval);
	}, [goNext, updateInterval]);

	useEffect(() => {
		resetNextTimer();
	}, [resetNextTimer]);

	const onAnimateEnter = useCallback(() => {
		setNextPageLoading(true);
	}, []);

	const onAnimateExit = useCallback(() => {
		setNextPageLoading(false);
	}, []);

	return (
		<NoSSR>
			<ChakraProvider>
				<LuoguTokenDialog />
				<Container
					width={"calc(100vw - 2rem)"}
					height={"100%"}
					maxW="container.xl"
				>
					{visibleCardCount !== 1 && (
						<Box className={"activeCardIndicator"}>
							<Stack direction={"column"} spacing={6}>
								<UpdateButton />
								<Stack direction={"column"} spacing={2}>
									<Tooltip label="刷新" placement="right">
										<IconButton
											isLoading={refreshLoading}
											aria-label={"refresh"}
											icon={<RepeatIcon />}
											variant={"solid"}
											onClick={() => {
												refresh()
													.then(() => {
														toast({
															title: "刷新成功",
															status: "success",
															duration: 2000,
															isClosable: true,
															position: "top",
														});
													})
													.catch(() => {
														toast({
															title: "刷新失败",
															status: "error",
															duration: 2000,
															isClosable: true,
															position: "top",
														});
													});
											}}
										/>
									</Tooltip>
									<Tooltip label="下一页" placement="right">
										<IconButton
											isLoading={nextPageLoading}
											aria-label={"next page"}
											icon={<TriangleDownIcon />}
											onClick={() => {
												goNext();
												resetNextTimer();
											}}
										/>
									</Tooltip>
								</Stack>
							</Stack>
						</Box>
					)}
					<Box m={6} p={6}>
						<AnimatePresence mode="popLayout">
							<motion.div
								key={`cards-${start}`}
								initial={{ y: 0, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								exit={{ y: 0, opacity: 0 }}
								transition={{ duration: 2 }}
								onAnimationStart={onAnimateEnter}
								onAnimationComplete={onAnimateExit}
							>
								<SimpleGrid
									columns={displayCardCount}
									spacing={10}
								>
									{visibleCards}
								</SimpleGrid>
							</motion.div>
						</AnimatePresence>
					</Box>
				</Container>
			</ChakraProvider>
		</NoSSR>
	);
}

export default Cards;
