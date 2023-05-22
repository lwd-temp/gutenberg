/**
 * WordPress dependencies
 */
import {
	privateApis as blockEditorPrivateApis,
	store as blockEditorStore,
	BlockList,
	BlockTools,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { VisuallyHidden } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { store as coreStore } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import { unlock } from '../../private-apis';
import LeafMoreMenu from './leaf-more-menu';

// Needs to be kept in sync with the query used at packages/block-library/src/page-list/edit.js.
const MAX_PAGE_COUNT = 100;
const PAGES_QUERY = [
	'postType',
	'page',
	{
		per_page: MAX_PAGE_COUNT,
		_fields: [ 'id', 'link', 'menu_order', 'parent', 'title', 'type' ],
		// TODO: When https://core.trac.wordpress.org/ticket/39037 REST API support for multiple orderby
		// values is resolved, update 'orderby' to [ 'menu_order', 'post_title' ] to provide a consistent
		// sort.
		orderby: 'menu_order',
		order: 'asc',
	},
];

export default function NavigationMenuContent( { rootClientId } ) {
	const [ isLoading, setIsLoading ] = useState( true );
	const { clientIdsTree, shouldKeepLoading, isSinglePageList } = useSelect(
		( select ) => {
			const {
				__unstableGetClientIdsTree,
				areInnerBlocksControlled,
				getBlockName,
			} = select( blockEditorStore );
			const { isResolving } = select( coreStore );

			const _clientIdsTree = __unstableGetClientIdsTree( rootClientId );
			const hasOnlyPageListBlock =
				_clientIdsTree.length === 1 &&
				getBlockName( _clientIdsTree[ 0 ].clientId ) ===
					'core/page-list';
			const isLoadingPages = isResolving(
				'getEntityRecords',
				PAGES_QUERY
			);
			return {
				clientIdsTree: _clientIdsTree,
				// This is a small hack to wait for the navigation block
				// to actually load its inner blocks.
				shouldKeepLoading:
					! areInnerBlocksControlled( rootClientId ) ||
					isLoadingPages,
				isSinglePageList:
					hasOnlyPageListBlock &&
					! isLoadingPages &&
					_clientIdsTree[ 0 ].innerBlocks.length > 0,
			};
		},
		[ rootClientId ]
	);

	// Delay loading stop by 50ms to avoid flickering.
	useEffect( () => {
		let timeoutId;
		if ( shouldKeepLoading && ! isLoading ) {
			setIsLoading( true );
		}
		if ( ! shouldKeepLoading && isLoading ) {
			timeoutId = setTimeout( () => {
				setIsLoading( false );
				timeoutId = undefined;
			}, 50 );
		}
		return () => {
			if ( timeoutId ) {
				clearTimeout( timeoutId );
			}
		};
	}, [ shouldKeepLoading, clientIdsTree, isLoading ] );

	const { PrivateListView } = unlock( blockEditorPrivateApis );

	// The hidden block is needed because it makes block edit side effects trigger.
	// For example a navigation page list load its items has an effect on edit to load its items.
	return (
		<>
			{ ! isLoading && (
				<PrivateListView
					blocks={
						isSinglePageList
							? clientIdsTree[ 0 ].innerBlocks
							: clientIdsTree
					}
					blockSettingsMenu={ LeafMoreMenu }
					showAppender={ false }
				/>
			) }
			<VisuallyHidden aria-hidden="true">
				<BlockTools>
					<BlockList />
				</BlockTools>
			</VisuallyHidden>
		</>
	);
}
